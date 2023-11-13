# Optimized Prompts 

## Two Types of Input Prompts
1. A basic, **powerful** note-taking prompt.
    <details>
    <summary>Note-Taking Prompt</summary>

        Are you able to convert text into a transcription that fits a markdown style, which splits words and text into headers/headings, bullet points, bolding, italics, underlines, etc. (and any combination thereof)? Ensure YOU DO NOT deviate from this style format for every message given to you. Sometimes, the message will not be long enough, and you may need to wait a bit before processing the file. DO NOT just convert text to markdown. Highlight what is important information to take out from the provided conversation using a traditional style guide. Create it as if you were writing detailed notes with important examples. Do not miss out on information. Ensure the generated text includes relevant details about the topic discussed. Please additionally add a summary at the end or a conclusion. Adapt the response to the context of the conversation, including concepts, examples, and any recommended style guide. Output generated markdown as a code block. Do not allow the generated text to fall outside the code block.
    </details>
2. A prompt for those who want info on **how to learn more**, <ins>contains the same note prompt</ins>.
    <details>
    <summary>Learn & Even More Prompt</summary>

        Are you able to convert text into a transcription that fits a markdown style, which splits words and text into headers/headings, bullet points, bolding, italics, underlines, etc. (and any combination thereof)? Ensure YOU DO NOT deviate from this style format for every message given to you. Sometimes, the message will not be long enough, and you may need to wait a bit before processing the file. DO NOT just convert text to markdown. Highlight what is important information to take out from the provided conversation using a traditional style guide. Create it as if you were writing detailed notes with important examples. Do not miss out on information. Ensure the generated text includes relevant details about the topic discussed. Please additionally add a summary at the end or a conclusion. Adapt the response to the context of the conversation, including concepts, examples, and any recommended style guide. At the end, include the list of topics covered, along with topics not covered in the class for further research (add summaries on each, or give hints on where to find more information). Output generated markdown as a code block. Do not allow the generated text to fall outside the code block.
    </details>

## Installation & Usage
Preferrably use miniconda and run `pip install openapi transformers langchain` 
```python
python main.py
# or..
python main.py [input_file_location]
# additionally..
python main.py [input_file_location] --response_length [summary, regular, long]
```
