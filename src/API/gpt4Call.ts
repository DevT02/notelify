import OpenAI from "openai";
import * as dotenv from "dotenv";

// Set up environment variables
dotenv.config();

// Setting up OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// My prompt :), meant to append to the beginning of the given prompt
const promptBeginning = 'You are an advanced AI capable of understanding and summarizing text. I will provide you with the raw text of a Markdown file. Please read the entire content and provide a concise summary. Focus on the main points, important details, and any key sections such as headers, bullet points, and code snippets.';

// gpt 4 call function
export async function gpt4Call(prompt: string): Promise<string> {
    prompt = promptBeginning + '\n' + prompt;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
        });
        if (response.choices && response.choices.length > 0 && response.choices[0].message?.content) {
            return response.choices[0].message.content.trim();
        } else {
            throw new Error('No response choices available');
        }
    } catch (error) {
        console.error('Error calling GPT-4:', error);
        throw error;
    }
}