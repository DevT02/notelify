/*
This backend API is meant to be used in conjunction with the DesktopAudio.tsx component.
For now, this API provides a transcription method to transcribe incoming audio blobs using OpenAI's
Whisper API. And, it also provides a method to summarize that transcribed string using OpenAI's GPT-3.5-turbo-instruct model.
*/

import OpenAI from "openai";
import * as dotenv from "dotenv";
import hark from "hark";
import { AssistantStream } from 'openai/lib/AssistantStream';
import { EventEmitter } from 'events';
import { response } from "express";
import { json } from "stream/consumers";
import { startupSnapshot } from "v8";
import { ProgressHTMLAttributes } from "react";
import { NutIcon } from "lucide-react";
import { gpt4Call } from "./gpt4Call";

// Set up environment variables
dotenv.config();



// Setting up OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// THE JSON OUTPUT FILE MUST BE FORMATTED THE FOLLOWING WAY. IT MUST HAVE THE OPENING AND CLOSING BRACKETS:
// Please DO NOT write anything in your reply outside of this JSON. Here is the format:

// {
//     "userid": "The user ID of the person who requested the summary",
//     "title": "The title of the conversation",
//     "content": "The summary of the conversation in markdown format",
//     "transcribed_text": "The transcribed text of the conversation",
// }


// const prompt = ''


// const prompt = `Imagine you are a student in a classroom, and you are taking notes on a lecture. Because you are
// a taking notes live, you need to be able to quickly and efficiently summarize the main points of the
// lecture. You also do not know the future of what is going to be said so you need to be able to identify
// the most important points as they come. This is a very important skill to have.
    
// You should also be able to tell when the speaker is talking about a new topic or a new idea.
// to best organize your notes you should organize them by topic and subtopics.

// You will be given pieces of the transcribed lecture/conversation and you need to find the noteworthy points as they come in.

// As a professional note-taker, you need to be able to quickly and efficiently summarize the main points of a conversation. However, you
// also will need to format the response correctly. 

// Convert transcribed text into key points and main ideas using Markdown, which splits 
// words and text into headers/headings, bullet points, bolding, italics, underlines, etc. 
// (and any combination thereof)? Ensure YOU DO NOT deviate from this style format for every 
// message given to you. Sometimes, the message will not be long enough, and you may need to wait 
// a bit before processing the file. DO NOT just convert text to markdown. Highlight what is 
// important information to take out from the provided conversation using a traditional style guide. 
// Create it as if you were writing detailed notes with important examples. Do not miss out on 
// information. Ensure the generated text includes relevant details about the topic discussed. 
// Please additionally add a summary at the end or a conclusion. Adapt the response to the context 
// of the conversation, including concepts, examples, and any recommended style guide. PLACE THIS OUTPUT IN THE content key.

// VERY IMPORTANT: The transcribed text may be formatted in this way: "The following text is from the 
// user speaker: [transcribed text]" or "The following text is from the other speaker: [transcribed text]".
// Here, the user speaker is the text from the user's microphone, and the other speaker is the text from 
// their desktop, which could be a video call, a lecture, or a podcast. The idea here is that you need to take the
// text from both the user and the other speaker (whatever that may be) and weave them together as coherently 
// as you possible can. The final summary should be a combination of both the user and the other speaker's and
// the summary MUST BE as natural as possible. Last but NOT THE LEAST, unless the two speakers are talking about very 
// different things, avoid saying things like "speaker 1 said this" or "other speak said that". Instead, 
// try to weave them together as naturally as possible. You can do it but just try to minimize it as much as possible. And,
// do NOT use the sentence "The following text is from the user speaker" or "The following text is from the other speaker".
// `;
const prompt = `
Imagine you are a student in a classroom, taking notes on a lecture. Since you are taking notes live, you need to quickly and efficiently summarize the main points of the lecture. You must be able to identify the most important points as they are presented, even without knowing what will be said next. This is a crucial skill to develop.

You should also recognize when the speaker is transitioning to a new topic or idea. To best organize your notes, structure them by topic and subtopics.

You will be given pieces of the transcribed lecture/conversation, and your task is to identify and extract noteworthy points as they appear.

As a professional note-taker, you must:

1. Quickly and efficiently summarize the main points of a conversation.
2. Correctly format your notes using Markdown, incorporating headers, bullet points, bolding, italics, and underlines.
3. Highlight important information and ensure detailed notes with relevant examples.
4. Adapt your notes to the context of the conversation, incorporating concepts, examples, and any recommended style guides.
5. Create a coherent summary at the end.
6. Seamlessly integrate both the user and other speaker's text, avoiding explicit mentions of "user speaker" or "other speaker" unless necessary for clarity.
7. Output your response BY USING A TOOL. 

**IMPORTANT!!!!** 
YOU SHOULD ALSO TAKE A GUESS AT WHICH CATEGORY THE CONTENT FALLS UNDER such as education, entertainment, persuasion, advertising, marketing, public relations, etc. and incorporate the BEST NOTE-TAKING practices for that category. FOR EXAMPLE:

For educational content, you might want to include the following elements in your notes:

- Use tables to organize comparative information or data.
- Include graphs where relevant to illustrate data points.
- Add code snippets or formulas in appropriate sections.

For a news channel, you might want to include the following elements in your notes:

- Use bold headers to indicate new sections or topics.
- Include bullet points for quick, digestible information.
- Highlight quotes or important statements using blockquotes.




Example Output (with line breaks for readability, output should be in a single block of text):
## Lecture Notes on Climate Change

### Introduction
- **Climate Change Definition:** The long-term alteration of temperature and typical weather patterns in a place.

### Causes of Climate Change
- **Greenhouse Gases:** Emissions from burning fossil fuels like coal, oil, and gas.
- **Deforestation:** Reduction of trees that absorb CO2.

### Impacts of Climate Change
- **Rising Sea Levels:** Due to melting polar ice caps.
- **Extreme Weather Events:** Increase in frequency and severity.

### Comparative Data
| Year | CO2 Emissions (ppm) | Global Temperature (°C) |
|------|----------------------|-------------------------|
| 2000 | 369                  | 14.3                    |
| 2010 | 389                  | 14.6                    |
| 2020 | 414                  | 15.0                    |

> "The evidence for rapid climate change is compelling." - NASA

### Summary

Climate change is driven by human activities and has severe impacts on the environment, necessitating urgent action.

ONCE AGAIN. OUTPUT YOUR RESPONSE BY USING A TOOL. ENSURE CONTENT IS NOT JUST BULLET POINTS AND HEADERS. IT SHOULD BE AS IF I WAS WRITING IT ON PEN AND PAPER.
`;


class BackendAudioAPI {
    assistant_id: any;
    previousText: string = "";
    processedbyGPT: Set<string> = new Set();
    
    async initAssistant(): Promise<void> {
        // Method that will initialize the GPT Assistant
        const assistantResponse = await openai.beta.assistants.create({
            name: "Professional Notetaker",
            instructions: prompt,
            // model: "gpt-3.5-turbo-0125",
            model: "gpt-4o",
            tools: [{
                "type": "function",
                "function": {    
                    "name": "summarize_conversation",
                    "description": "Note-taking with title and various markdown styles in a summary",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "userid": {
                                "type": "string",
                                "description": "The user ID of the person who requested the summary"
                            },
                            "title": {
                                "type": "string",
                                "description": "The title of the entire conversation"
                            },
                            "sections": { 
                                "type": "array",
                                "description": "The sections of the conversation",
                                "items": {
                                    "type": "object",
                                    "required": ["section-title", "section-content"],
                                    "properties": {
                                        "section-title": {
                                            "type": "string",
                                            "description": "The title of the specific conversation"
                                        },
                                        "section-content": {
                                            "type": "string",
                                            "description": "The summary of the conversation with various styles from a markdown style in markdown format."
                                        }
                                    }
                                }
                            }
                        },
                        "required": [ "userid", "title", "sections"]
                    }
                }
            }]
        });
        this.assistant_id = assistantResponse.id;
    }

    async transcribe(audioBlob: Blob): Promise<string> {
        // Method that will transcribe the blob using OpenAI's Whisper API
        const file = new File([audioBlob], "audio.wav", { "type": 'audio/wav; codecs=1' });

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
        }).then((res: OpenAI.Audio.Transcriptions.Transcription) => {
            return res.text;
        }).catch((err: any) => { 
            console.error(err); 
            return "";  
        });

        return transcription;
    }
    
    async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // This method is relies on the fact that everything is added to the end of whisper. Uses LCS.
    async textChanged(newText: string): Promise<string> {
        if (this.previousText === newText) {
            return "";
        }
    
        let index = -1;
        // Find the index where new unique text starts in the newText by comparing it from the end
        for (let i = 0; i < this.previousText.length && i < newText.length; i++) {
            if (newText[i] !== this.previousText[i]) {
                index = i;
                break;
            }
        }
    
        let actualNewText = "";
        if (index !== -1) {
            actualNewText = newText.substring(index);
        } else {
            actualNewText = newText;
        }
    
        // Update previousText with the current newText for the next call
        this.previousText = newText;
    
        return actualNewText;    
    }
    
    // figure out a better solution for this
    async processTextWithDelay(text: string, props: any, lineBreaks?: number): Promise<void> {
        const lines = text.split('\n');
    
        const processLineWithDelay = (line: string, delay: number) => {
            return new Promise(resolve => setTimeout(() => {
                // Check if lineBreaks are provided, else default to using appendContent without it.
                if (lineBreaks !== undefined) {
                    props.editorRef.current?.appendContent(line, lineBreaks);
                } else {
                    props.editorRef.current?.appendContent(line);
                }
    
                console.log(line); // Log the line to the console for debugging
                resolve(line);
            }, delay));
        };
    
        // Process each line with a random delay between 10ms and 100ms
        for (const line of lines) {
            const delay = Math.random() * (100 - 10) + 10;
            await processLineWithDelay(line, delay);
        }
    }
    
    
    async summarize(text: string, props: any, supabaseInstance: any, currNoteId: number): Promise<void>{
        console.log(`Transcribed Text: ${text}`);
        
        const isTextValid = text.includes("The following text is from the user speaker:") && text.includes("The following text is from the other speaker:");
        const isEmpty = text.trim() === "";
        if (isTextValid || isEmpty) {
            return; // Early return to avoid processing this text
        }

        if (props.editorRef.current?.getHTML() === "<p>Notes will be generated here...</p>") {
            props.editorRef.current?.clearContent();
        }
          
        
        try {

            // Combine text that wasn't processed by GPT (sometimes happens when the text is too short)
            text = Array.from(this.processedbyGPT).join(' ') + text;
            this.processedbyGPT.clear(); 
            this.processedbyGPT.add(text);  

            console.log(`Text to be processed: ${text}`);


            // Create a thread with an id.
            const thread = await openai.beta.threads.create();

            // Create a message.
            const msg = await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: `${text}`,
            });

            // To ensure textDelta works correctly.
            let additionalCallsCount = 0;
            let waitMoreCalls = false; 

            // Run the assistant.
            const run = openai.beta.threads.runs.stream(thread.id, {
                assistant_id: this.assistant_id,
            }
            ).on("event", async (evt: any) => {
                // This event is an example to get JSON output from the assistant. It will be useful to get user_id, title, content, and transcribed_text.

                if (evt.event === "thread.run.requires_action") {
                        
                    const jsonText = evt.data.required_action?.submit_tool_outputs.tool_calls[0].function.arguments;
                    if (jsonText) {
                        try {
                            const parsedJson = JSON.parse(jsonText);
                            console.log(parsedJson);
                            for (let i = 0; i < parsedJson.sections.length; ++i) {
                                let title = parsedJson.sections[i]["section-title"];
                                let content = parsedJson.sections[i]["section-content"];
                                console.log(content, "h1");
                                console.log(title, "h2");
                                // clear content as we know it has been processed.
                                this.processedbyGPT.clear();

                                await this.processTextWithDelay("## " + title, props);
                                await this.processTextWithDelay(content, props, 2);

                                // Insert this section into the database
                                const { errror } = await supabaseInstance
                                    .from("sections")
                                    .insert([
                                        {
                                            section_title: title,
                                            section_content: content,
                                            parent_note_id: currNoteId
                                        }
                                    ])
                            }
                        }
                        catch (err) {
                        }
                    }
                }
                // else if (evt.event === "thread.run.completed") {
                //     let messages = await openai.beta.threads.messages.list(thread.id);
                //     let content = messages.data[0]['content'][0]['text'].value;

                //     console.log(content);
                //     console.log(messages.data);

                //     if (content) {
                //         try {
                //             let title = "blank"
                //             // clear content as we know it has been processed.
                //             processedbyGPT.clear();

                //             await this.processTextWithDelay(content, props, 2);

                //             // Insert this section into the database
                //             const { errror } = await supabaseInstance
                //                 .from("sections")
                //                 .insert([
                //                     {
                //                         section_title: title,
                //                         section_content: content,
                //                         parent_note_id: currNoteId
                //                     }
                //                 ]);
                //         }
                //         catch (err) {
                //             console.log("Waiting for section-title/section-content", err);
                //         }
                //     }
                // }
            });

            // ).on('toolCallDelta', (toolCallDelta: any, snapshot: any) => {
            
            //     if (waitMoreCalls) {
            //         additionalCallsCount++;
            //     }
            
            //     console.log('toolCallDelta:', toolCallDelta);
            //     if (toolCallDelta.type === 'function') {
                    
            //         if (toolCallDelta.function.arguments == "section-content") {
            //             waitMoreCalls = true; // In he right spot
            //         }
            //         if (waitMoreCalls && toolCallDelta.function.arguments != "transcribed_text" && toolCallDelta.function.arguments != "-") {
            //             console.log(toolCallDelta.function.arguments);
            //             props.editorRef.current?.appendContent(toolCallDelta.function.arguments);
            //         }
            //     }
            // });

        } catch (err) {
            console.error(err);
        }
    }

    async isSpeaking(mediaStream: MediaStream): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const options = { threshold: -50, interval: 200 };
            const speechEvents = hark(mediaStream, options);
    
            speechEvents.on('speaking', () => {
                resolve(true);
            });
    
            speechEvents.on('stopped_speaking', () => {
                reject(false);
            });
        });
    }
    
    async startEndSummarize(props: any): Promise<void> {
        // get editor content, then summarize it/append it to the editor
        const content = props.editorRef.current?.getText(); // 
        
        const gptEndSummary = gpt4Call(content);

        props.editorRef.current?.appendContent(gptEndSummary);
    }

}

export default BackendAudioAPI;
