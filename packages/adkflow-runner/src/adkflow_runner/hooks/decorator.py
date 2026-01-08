"""Decorator for registering hooks on extension classes and functions."""

from typing import Any, Callable, TypeVar

from adkflow_runner.hooks.types import HookSpec, validate_hook_name

# Attribute name for storing hook specs on decorated functions/methods
HOOK_ATTR = "_adkflow_hooks"

F = TypeVar("F", bound=Callable[..., Any])


def hook(
    hook_name: str,
    *,
    priority: int = 0,
    timeout: float = 30.0,
) -> Callable[[F], F]:
    """Decorator to mark a method or function as a hook handler.

    Can be used on class methods or standalone functions.

    Args:
        hook_name: The hook point to register for (e.g., "before_tool_call")
        priority: Execution priority (higher = runs first). Default: 0
        timeout: Maximum execution time in seconds. Default: 30.0

    Returns:
        Decorated function with hook metadata attached

    Example:
        class MyExtension:
            @hook("before_tool_call", priority=100)
            async def rate_limit(self, ctx: HookContext) -> HookResult:
                # ... implementation
                return HookResult.continue_()

        @hook("after_run")
        async def log_completion(ctx: HookContext) -> HookResult:
            print(f"Run {ctx.run_id} completed")
            return HookResult.continue_()
    """
    validate_hook_name(hook_name)

    def decorator(func: F) -> F:
        # Get or create the hooks list on this function
        hooks: list[HookSpec] = getattr(func, HOOK_ATTR, [])

        # Create spec for this hook
        spec = HookSpec(
            hook_name=hook_name,
            handler=func,
            priority=priority,
            timeout_seconds=timeout,
            method_name=func.__name__,
        )

        hooks.append(spec)
        setattr(func, HOOK_ATTR, hooks)

        return func

    return decorator


def get_hooks_from_object(obj: Any) -> list[HookSpec]:
    """Extract all hook specs from an object (class instance or module).

    Scans all attributes of the object for decorated methods/functions.

    Args:
        obj: Object to scan for hooks

    Returns:
        List of HookSpec objects found on the object
    """
    specs: list[HookSpec] = []

    # Scan all attributes
    for attr_name in dir(obj):
        if attr_name.startswith("_"):
            continue

        try:
            attr = getattr(obj, attr_name)
        except Exception:
            continue

        # Check if this attribute has hook specs
        hook_specs: list[HookSpec] | None = getattr(attr, HOOK_ATTR, None)
        if hook_specs:
            for spec in hook_specs:
                # Create a new spec bound to this object's method
                bound_spec = HookSpec(
                    hook_name=spec.hook_name,
                    handler=attr,  # Use bound method
                    priority=spec.priority,
                    timeout_seconds=spec.timeout_seconds,
                    extension_id=getattr(obj, "EXTENSION_ID", obj.__class__.__name__),
                    method_name=spec.method_name,
                )
                specs.append(bound_spec)

    return specs


def get_hooks_from_function(func: Callable[..., Any]) -> list[HookSpec]:
    """Extract hook specs from a standalone function.

    Args:
        func: Function to check for hook decorators

    Returns:
        List of HookSpec objects found on the function
    """
    specs: list[HookSpec] = getattr(func, HOOK_ATTR, [])
    return [
        HookSpec(
            hook_name=spec.hook_name,
            handler=func,
            priority=spec.priority,
            timeout_seconds=spec.timeout_seconds,
            extension_id=func.__module__,
            method_name=func.__name__,
        )
        for spec in specs
    ]
