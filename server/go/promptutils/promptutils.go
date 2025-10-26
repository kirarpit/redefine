package promptutils

import "strings"

type outputInstruction struct {
	marker string
	text   string
}

var instructions = map[string]outputInstruction{
	"general": {
		marker: "Output the response in the following YAML structure",
		text: "Output the response in the following YAML structure.\n\n" +
			"```yaml\n" +
			"query: <string>\n" +
			"type: <string>\n" +
			"explanation: >\\s<string>\n" +
			"pronunciation: >\\s<string|null> # key words as a single string\n" +
			"related_items:\n" +
			"  - <string>\n" +
			"quotes:\n" +
			"  - >\\s<string>\n" +
			"```",
	},
	"anki": {
		marker: "Output the flashcards in the following YAML structure",
		text: "Output the flashcards in the following YAML structure:\n\n" +
			"```yaml\n" +
			"flashcards:\n" +
			"  - type: one of [cloze, basic, reversed]\n" +
			"    front: >\n" +
			"      <string>\n" +
			"    back: <string>  # not required for cloze\n" +
			"```",
	},
}

// AppendOutputInstructions adds the output instruction block (when missing) so
// the LLM always receives the expected response format guidance.
func AppendOutputInstructions(template string, promptType string) string {
	info, ok := instructions[promptType]
	if !ok || info.text == "" {
		return template
	}

	if strings.Contains(template, info.marker) {
		return template
	}

	trimmed := strings.TrimRight(template, " \r\n")
	if trimmed == "" {
		return info.text
	}

	return trimmed + "\n\n" + info.text
}
