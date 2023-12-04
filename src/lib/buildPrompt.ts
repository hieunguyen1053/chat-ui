import type { BackendModel } from "./server/models";
import type { Message } from "./types/Message";
import { format } from "date-fns";
import type { WebSearch } from "./types/WebSearch";
/**
 * Convert [{user: "assistant", content: "hi"}, {user: "user", content: "hello"}] to:
 *
 * <|assistant|>hi<|endoftext|><|prompter|>hello<|endoftext|><|assistant|>
 */

interface buildPromptOptions {
	messages: Pick<Message, "from" | "content">[];
	model: BackendModel;
	locals?: App.Locals;
	webSearch?: WebSearch;
	preprompt?: string;
}

export async function buildPrompt({
	messages,
	model,
	webSearch,
	preprompt,
}: buildPromptOptions): Promise<string> {
	if (webSearch && webSearch.context) {
		const messagesWithoutLastUsrMsg = messages.slice(0, -1);
		const lastUserMsg = messages.slice(-1)[0];
		const currentDate = format(new Date(), "MMMM d, yyyy");
		messages = [
			...messagesWithoutLastUsrMsg,
			{
				from: "user",
				content: `References:\n\n${webSearch.context}Question: ${lastUserMsg.content}`,
			},
		];
		preprompt = `<s>[INST] <<SYS>>\nAnswer the question based on the following references with citations. Use a mark for each helpful reference you cited, such as [1]. If there are multiple citations at one position, please use a format like [1][2][3]. If a reference is useless, do not cite it.\n\nI will provide you with some references. Based on the references, please answer my question. Pay attention that you should be objective, and you should not use your knowledge. Use a mark for each helpful reference you cited, such as [1]. If there are multiple citations at one position, please use a format like [1][2][3]. If a reference is useless, do not cite it.\n<</SYS>>\n\n`;
	}
	return (
		model
			.chatPromptRender({ messages, preprompt })
			// Not super precise, but it's truncated in the model's backend anyway
			.split(" ")
			.slice(-(model.parameters?.truncate ?? 0))
			.join(" ")
	);
}
