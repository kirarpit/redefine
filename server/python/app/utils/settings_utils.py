import os
import yaml


def load_prompt_template(template_name="default_explanation"):
    """Load a prompt template from a YAML file."""
    template_path = os.path.join(
        os.path.dirname(__file__), "../prompts", f"{template_name}.yaml"
    )

    with open(template_path, "r") as file:
        template_data = yaml.safe_load(file)
        return template_data["prompt"]["template"]
