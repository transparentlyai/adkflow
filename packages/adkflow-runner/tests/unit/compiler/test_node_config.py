"""Tests for node configuration access utilities."""

import pytest

from adkflow_runner.compiler.node_config import get_node_config, get_config_field


class TestGetNodeConfig:
    """Tests for get_node_config function."""

    def test_returns_config_when_present(self):
        """Return config dict when present in data."""
        data = {"config": {"name": "TestAgent", "model": "gemini-pro"}}
        result = get_node_config(data)
        assert result == {"name": "TestAgent", "model": "gemini-pro"}

    def test_returns_empty_dict_when_no_config(self):
        """Return empty dict when config not present."""
        data = {"label": "My Node"}
        result = get_node_config(data)
        assert result == {}

    def test_returns_empty_dict_for_empty_data(self):
        """Return empty dict for empty data."""
        result = get_node_config({})
        assert result == {}

    def test_handles_nested_config(self):
        """Handle nested configuration properly."""
        data = {
            "config": {
                "name": "Agent",
                "nested": {"key": "value"},
            }
        }
        result = get_node_config(data)
        assert result["nested"]["key"] == "value"


class TestGetConfigField:
    """Tests for get_config_field function."""

    def test_returns_field_value(self):
        """Return field value when present."""
        data = {"config": {"name": "TestAgent", "model": "gemini-pro"}}
        assert get_config_field(data, "name") == "TestAgent"
        assert get_config_field(data, "model") == "gemini-pro"

    def test_returns_default_when_field_missing(self):
        """Return default when field not present."""
        data = {"config": {"name": "TestAgent"}}
        result = get_config_field(data, "model", "default-model")
        assert result == "default-model"

    def test_returns_none_as_default(self):
        """Return None when field missing and no default specified."""
        data = {"config": {}}
        result = get_config_field(data, "missing")
        assert result is None

    def test_handles_no_config(self):
        """Return default when config not present."""
        data = {"label": "My Node"}
        result = get_config_field(data, "name", "default")
        assert result == "default"

    def test_handles_falsy_values(self):
        """Correctly return falsy values that are set."""
        data = {"config": {"enabled": False, "count": 0, "text": ""}}
        assert get_config_field(data, "enabled") is False
        assert get_config_field(data, "count") == 0
        assert get_config_field(data, "text") == ""
