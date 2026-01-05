"""Tests for tracing setup."""

import json


from adkflow_runner.telemetry.setup import (
    TracingConfig,
    is_tracing_enabled,
    DEFAULT_TRACE_FILE,
)


class TestTracingConfig:
    """Tests for TracingConfig dataclass."""

    def test_default_values(self):
        """Default config has expected values."""
        config = TracingConfig()
        assert config.enabled is True
        assert config.file == DEFAULT_TRACE_FILE
        assert config.clear_before_run is False

    def test_custom_values(self):
        """Create config with custom values."""
        config = TracingConfig(
            enabled=False,
            file="custom.jsonl",
            clear_before_run=True,
        )
        assert config.enabled is False
        assert config.file == "custom.jsonl"
        assert config.clear_before_run is True


class TestTracingConfigLoad:
    """Tests for TracingConfig.load method."""

    def test_load_defaults_no_manifest(self, tmp_path):
        """Load returns defaults when no manifest exists."""
        config = TracingConfig.load(tmp_path)
        assert config.enabled is True
        assert config.file == DEFAULT_TRACE_FILE

    def test_load_from_manifest(self, tmp_path):
        """Load reads from manifest.json."""
        manifest = {
            "logging": {
                "tracing": {
                    "enabled": False,
                    "file": "custom_traces.jsonl",
                }
            }
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        config = TracingConfig.load(tmp_path)
        assert config.enabled is False
        assert config.file == "custom_traces.jsonl"

    def test_load_env_overrides_manifest(self, tmp_path, monkeypatch):
        """Environment variables override manifest values."""
        manifest = {"logging": {"tracing": {"enabled": True}}}
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        monkeypatch.setenv("ADKFLOW_TRACING_ENABLED", "false")
        config = TracingConfig.load(tmp_path)
        assert config.enabled is False

    def test_load_env_trace_file(self, tmp_path, monkeypatch):
        """ADKFLOW_TRACE_FILE env var sets file path."""
        monkeypatch.setenv("ADKFLOW_TRACE_FILE", "env_traces.jsonl")
        config = TracingConfig.load(tmp_path)
        assert config.file == "env_traces.jsonl"

    def test_load_invalid_manifest_json(self, tmp_path):
        """Invalid JSON in manifest returns defaults."""
        (tmp_path / "manifest.json").write_text("not valid json")
        config = TracingConfig.load(tmp_path)
        assert config.enabled is True

    def test_load_manifest_missing_logging(self, tmp_path):
        """Manifest without logging section returns defaults."""
        manifest = {"name": "test"}
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))
        config = TracingConfig.load(tmp_path)
        assert config.enabled is True


class TestIsTracingEnabled:
    """Tests for is_tracing_enabled function."""

    def test_returns_initialization_state(self):
        """Returns current initialization state."""
        import adkflow_runner.telemetry.setup as setup_module

        original = setup_module._tracing_initialized

        setup_module._tracing_initialized = False
        assert is_tracing_enabled() is False

        setup_module._tracing_initialized = True
        assert is_tracing_enabled() is True

        # Reset
        setup_module._tracing_initialized = original


class TestTracingConfigEnvVariables:
    """Tests for environment variable parsing."""

    def test_enabled_true_values(self, tmp_path, monkeypatch):
        """Various truthy values for ADKFLOW_TRACING_ENABLED."""
        for value in ["true", "TRUE", "True", "1", "yes", "YES"]:
            monkeypatch.setenv("ADKFLOW_TRACING_ENABLED", value)
            config = TracingConfig.load(tmp_path)
            assert config.enabled is True, f"Failed for value: {value}"

    def test_enabled_false_values(self, tmp_path, monkeypatch):
        """Various falsy values for ADKFLOW_TRACING_ENABLED."""
        for value in ["false", "FALSE", "0", "no", ""]:
            monkeypatch.setenv("ADKFLOW_TRACING_ENABLED", value)
            config = TracingConfig.load(tmp_path)
            assert config.enabled is False, f"Failed for value: {value}"


class TestTracingConfigManifestParsing:
    """Tests for manifest tracing configuration."""

    def test_clear_before_run_from_manifest(self, tmp_path):
        """Load clear_before_run from manifest."""
        manifest = {
            "logging": {
                "tracing": {
                    "clear_before_run": True,
                }
            }
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        config = TracingConfig.load(tmp_path)
        assert config.clear_before_run is True

    def test_partial_manifest_config(self, tmp_path):
        """Partial manifest config uses defaults for missing fields."""
        manifest = {
            "logging": {
                "tracing": {
                    "file": "partial.jsonl",
                }
            }
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        config = TracingConfig.load(tmp_path)
        assert config.file == "partial.jsonl"
        assert config.enabled is True  # Default
        assert config.clear_before_run is False  # Default
