"""Workflow executor for ADKFlow using Google ADK."""

import asyncio
import os
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed

from google import genai
from google.genai import types
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.panel import Panel
from rich.syntax import Syntax
from rich.markdown import Markdown

from adkflow.variable_resolver import resolve_dict_variables
from adkflow.tools import get_tools

console = Console()


class WorkflowExecutor:
    """Executes ADKFlow workflows using Google ADK agents."""

    def __init__(self, api_key: str | None = None, verbose: bool = False):
        """Initialize the workflow executor.

        Args:
            api_key: Google API key for ADK, or "vertex" to use Vertex AI with ADC
                    (if None, reads from GOOGLE_API_KEY env var)
            verbose: Enable verbose output
        """
        self.verbose = verbose
        self.context = {}  # Shared context across agents
        self.agent_outputs = {}  # Store outputs from each agent/subagent

        # Initialize Google ADK client
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key is required. Set GOOGLE_API_KEY environment variable "
                "or pass api_key parameter. Use 'vertex' to use Vertex AI with ADC."
            )

        # Configure the client
        if self.api_key.lower() == "vertex":
            # Use Vertex AI with Application Default Credentials
            project = os.getenv("GOOGLE_CLOUD_PROJECT")
            location = os.getenv("GOOGLE_CLOUD_REGION", "us-central1")

            if not project:
                raise ValueError(
                    "GOOGLE_CLOUD_PROJECT environment variable is required when using Vertex AI. "
                    "Set it to your GCP project ID."
                )

            if self.verbose:
                console.print(f"[blue]Using Vertex AI with Application Default Credentials[/blue]")
                console.print(f"[blue]Project: {project}, Location: {location}[/blue]")

            self.client = genai.Client(
                vertexai=True,
                project=project,
                location=location
            )
            self.use_vertex = True
        else:
            # Use standard API key authentication
            if self.verbose:
                console.print("[blue]Using Google AI API with API key[/blue]")

            self.client = genai.Client(api_key=self.api_key)
            self.use_vertex = False

        if self.verbose:
            console.print("[green]✓ Google ADK client initialized[/green]")

    def execute_workflow(self, workflow: dict, variables: dict) -> Any:
        """Execute a complete workflow.

        Args:
            workflow: Parsed and validated workflow dictionary
            variables: Runtime variables for the workflow

        Returns:
            Result of the workflow execution
        """
        # Merge workflow variables with runtime variables
        workflow_vars = workflow.get("workflow", {}).get("variables", {})
        merged_vars = {}

        # Add default values from workflow variables
        for var_name, var_config in workflow_vars.items():
            if isinstance(var_config, dict) and "default" in var_config:
                merged_vars[var_name] = var_config["default"]

        # Override with runtime variables
        merged_vars.update(variables)

        # Resolve variables in the entire workflow
        workflow = resolve_dict_variables(workflow, merged_vars)

        workflow_name = workflow.get("workflow", {}).get("name", "Unnamed workflow")
        workflow_desc = workflow.get("workflow", {}).get("description")

        if self.verbose:
            console.print(f"\n[bold]Executing workflow: {workflow_name}[/bold]")
            if workflow_desc:
                console.print(f"Description: {workflow_desc}")

        agents = workflow.get("workflow", {}).get("agents", [])
        if not agents:
            console.print("[yellow]Warning: No agents defined in workflow[/yellow]")
            return None

        result = None

        # Execute agents in order
        for i, agent in enumerate(agents):
            agent_id = agent.get("id", f"agent_{i}")
            agent_type = agent.get("type", "llm")

            if self.verbose:
                console.print(f"\n[cyan]Executing agent: {agent_id} (type: {agent_type})[/cyan]")

            try:
                if agent_type == "sequential":
                    result = self.execute_sequential(agent, workflow, merged_vars)
                elif agent_type == "parallel":
                    result = self.execute_parallel(agent, workflow, merged_vars)
                elif agent_type == "llm":
                    result = self.execute_llm(agent, workflow, merged_vars)
                else:
                    console.print(f"[red]Unknown agent type: {agent_type}[/red]")
                    continue

                # Store result in context for next agent
                self.context[agent_id] = result
                self.agent_outputs[agent_id] = result

            except Exception as e:
                console.print(f"[red]Error executing agent {agent_id}: {str(e)}[/red]")
                if self.verbose:
                    import traceback
                    console.print(traceback.format_exc())
                raise

        return result

    def execute_sequential(self, agent: dict, workflow: dict, variables: dict) -> Any:
        """Execute a sequential agent (subagents run one after another).

        Args:
            agent: Agent configuration dictionary
            workflow: Full workflow dictionary for prompt resolution
            variables: Runtime variables

        Returns:
            Result of the sequential execution
        """
        agent_id = agent.get("id", "unknown")
        subagents = agent.get("subagents", [])
        model = agent.get("model", "gemini-2.0-flash-exp")
        temperature = agent.get("temperature", 0.7)
        agent_tools = agent.get("tools", [])

        if not subagents:
            console.print(f"[yellow]Warning: No subagents defined for {agent_id}[/yellow]")
            return None

        if self.verbose:
            console.print(f"  Executing {len(subagents)} subagents sequentially...")
            console.print(f"  Model: {model}, Temperature: {temperature}")

        results = []
        previous_output = None

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            console=console,
        ) as progress:
            task = progress.add_task(
                f"Running sequential agent: {agent_id}",
                total=len(subagents)
            )

            for i, subagent in enumerate(subagents):
                subagent_id = subagent.get("id", f"subagent_{i}")
                prompt_ref = subagent.get("prompt_ref")
                subagent_tools = subagent.get("tools", agent_tools)

                if self.verbose:
                    console.print(f"\n  → [bold]{subagent_id}[/bold]")

                try:
                    # Get the prompt content
                    prompt_content = self._resolve_prompt(workflow, prompt_ref, variables)

                    # Add context from previous subagent if available
                    if previous_output:
                        context_text = f"\n\n## Context from previous step:\n{previous_output}"
                        prompt_content += context_text

                    # Execute the subagent
                    result = self._execute_subagent(
                        subagent_id=subagent_id,
                        prompt=prompt_content,
                        model=model,
                        temperature=temperature,
                        tools=subagent_tools
                    )

                    results.append({
                        "subagent_id": subagent_id,
                        "result": result
                    })

                    # Store output for next subagent
                    previous_output = result
                    self.agent_outputs[f"{agent_id}.{subagent_id}"] = result

                    if self.verbose:
                        console.print(f"  [green]✓ {subagent_id} completed[/green]")

                except Exception as e:
                    console.print(f"  [red]✗ {subagent_id} failed: {str(e)}[/red]")
                    raise

                progress.update(task, advance=1)

        return {
            "agent_id": agent_id,
            "type": "sequential",
            "results": results,
            "final_output": previous_output
        }

    def execute_parallel(self, agent: dict, workflow: dict, variables: dict) -> Any:
        """Execute a parallel agent (subagents run concurrently).

        Args:
            agent: Agent configuration dictionary
            workflow: Full workflow dictionary for prompt resolution
            variables: Runtime variables

        Returns:
            Result of the parallel execution
        """
        agent_id = agent.get("id", "unknown")
        subagents = agent.get("subagents", [])
        model = agent.get("model", "gemini-2.0-flash-exp")
        temperature = agent.get("temperature", 0.7)
        agent_tools = agent.get("tools", [])

        if not subagents:
            console.print(f"[yellow]Warning: No subagents defined for {agent_id}[/yellow]")
            return None

        if self.verbose:
            console.print(f"  Executing {len(subagents)} subagents in parallel...")
            console.print(f"  Model: {model}, Temperature: {temperature}")

        results = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            console=console,
        ) as progress:
            task = progress.add_task(
                f"Running parallel agent: {agent_id}",
                total=len(subagents)
            )

            # Use ThreadPoolExecutor for parallel execution
            with ThreadPoolExecutor(max_workers=min(len(subagents), 5)) as executor:
                # Submit all subagents for execution
                futures = {}
                for i, subagent in enumerate(subagents):
                    subagent_id = subagent.get("id", f"subagent_{i}")
                    prompt_ref = subagent.get("prompt_ref")
                    subagent_tools = subagent.get("tools", agent_tools)

                    if self.verbose:
                        console.print(f"  ⇉ [bold]{subagent_id}[/bold] (starting)")

                    # Get the prompt content
                    prompt_content = self._resolve_prompt(workflow, prompt_ref, variables)

                    # Submit for parallel execution
                    future = executor.submit(
                        self._execute_subagent,
                        subagent_id=subagent_id,
                        prompt=prompt_content,
                        model=model,
                        temperature=temperature,
                        tools=subagent_tools
                    )
                    futures[future] = subagent_id

                # Collect results as they complete
                for future in as_completed(futures):
                    subagent_id = futures[future]
                    try:
                        result = future.result()
                        results.append({
                            "subagent_id": subagent_id,
                            "result": result
                        })
                        self.agent_outputs[f"{agent_id}.{subagent_id}"] = result

                        if self.verbose:
                            console.print(f"  [green]✓ {subagent_id} completed[/green]")

                    except Exception as e:
                        console.print(f"  [red]✗ {subagent_id} failed: {str(e)}[/red]")
                        results.append({
                            "subagent_id": subagent_id,
                            "error": str(e)
                        })

                    progress.update(task, advance=1)

        return {
            "agent_id": agent_id,
            "type": "parallel",
            "results": results,
            "success_count": len([r for r in results if "error" not in r]),
            "failure_count": len([r for r in results if "error" in r])
        }

    def execute_llm(self, agent: dict, workflow: dict, variables: dict) -> Any:
        """Execute a standalone LLM agent.

        Args:
            agent: Agent configuration dictionary
            workflow: Full workflow dictionary for prompt resolution
            variables: Runtime variables

        Returns:
            Result of the LLM execution
        """
        agent_id = agent.get("id", "unknown")
        model = agent.get("model", "gemini-2.0-flash-exp")
        temperature = agent.get("temperature", 0.7)
        instruction = agent.get("instruction", "")
        tools = agent.get("tools", [])

        if self.verbose:
            console.print(f"  Model: {model}")
            console.print(f"  Temperature: {temperature}")
            console.print(f"  Instruction: {instruction[:100]}...")
            if tools:
                console.print(f"  Tools: {', '.join(tools)}")

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(f"Running LLM agent: {agent_id}", total=None)

            try:
                result = self._execute_subagent(
                    subagent_id=agent_id,
                    prompt=instruction,
                    model=model,
                    temperature=temperature,
                    tools=tools
                )
                progress.update(task, completed=True)

                return {
                    "agent_id": agent_id,
                    "type": "llm",
                    "model": model,
                    "result": result
                }

            except Exception as e:
                console.print(f"[red]Error executing LLM agent: {str(e)}[/red]")
                raise

    def _resolve_prompt(self, workflow: dict, prompt_ref: str, variables: dict) -> str:
        """Resolve a prompt reference to its actual content.

        Args:
            workflow: Full workflow dictionary
            prompt_ref: Reference to a prompt in the workflow
            variables: Variables for substitution

        Returns:
            Resolved prompt content with variables substituted
        """
        prompts = workflow.get("workflow", {}).get("prompts", {})

        if prompt_ref not in prompts:
            raise ValueError(f"Prompt reference '{prompt_ref}' not found in workflow")

        prompt_config = prompts[prompt_ref]
        prompt_content = prompt_config.get("content", "")

        # Variable substitution is already done by resolve_dict_variables
        # in execute_workflow, so we just return the content
        return prompt_content.strip()

    def _execute_subagent(
        self,
        subagent_id: str,
        prompt: str,
        model: str,
        temperature: float,
        tools: list[str]
    ) -> str:
        """Execute a single subagent using Google ADK.

        Args:
            subagent_id: Identifier for the subagent
            prompt: The prompt/instruction to send to the agent
            model: Model name to use
            temperature: Temperature setting for generation
            tools: List of tool names to enable

        Returns:
            Agent's response text
        """
        try:
            # Get tool instances from tool names
            tool_instances = get_tools(tools) if tools else []

            if self.verbose:
                if tool_instances:
                    tool_names = ", ".join(tools)
                    console.print(f"    Tools: {tool_names}")

            # Create generation config
            config = types.GenerateContentConfig(
                temperature=temperature,
                system_instruction=None,  # Could be added if needed
            )

            # Generate content using Google ADK
            response = self.client.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
                tools=tool_instances if tool_instances else None,
            )

            # Extract text from response
            if hasattr(response, "text"):
                result_text = response.text
            elif hasattr(response, "candidates") and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, "content") and hasattr(candidate.content, "parts"):
                    result_text = "".join(
                        part.text for part in candidate.content.parts if hasattr(part, "text")
                    )
                else:
                    result_text = str(candidate)
            else:
                result_text = str(response)

            # Display output if verbose
            if self.verbose:
                console.print(Panel(
                    Markdown(result_text[:500] + ("..." if len(result_text) > 500 else "")),
                    title=f"Output from {subagent_id}",
                    border_style="blue"
                ))

            return result_text

        except Exception as e:
            console.print(f"[red]Error in _execute_subagent ({subagent_id}): {str(e)}[/red]")
            raise
