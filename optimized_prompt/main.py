# Prompt Engineering

import openai
import argparse
from config import OPENAI_API_KEY # define key in config.py
import time
import os

openai.api_key = OPENAI_API_KEY
script_directory = os.path.dirname(os.path.abspath(__file__))
default_input_file = os.path.join(script_directory, "input.txt")  

chars_before_update = 50 # Number of characters before updating the prompt
input_prompt = "Are you able to convert text into transcription that fits a markdown style, as in a traditional page on a note-taking website or github readme, which splits words and text into headers, bulletpoints, bolding, italics, underlines, etc (and any combination). ensure YOU DO NOT deviate from this style format for every message given to you. Sometimes, the message will not be long enough, and you may need to wait a bit before processing the file. DO NOT just convert text to markdown. Highlight important bits using a traditional style guide and create it as if you were writing notes for a class. "

def convert_to_markdown(text, response_length = "medium"):
    prompt = f"{input_prompt}:\n\n{text}\n\n---\n\n"


    if response_length == "summary":
        max_tokens = 50
    elif response_length == "regular":
        max_tokens = 150
    elif response_length == "long":
        max_tokens = 300
    else:
        raise ValueError("Invalid response_length. Choose from 'summary', 'regular', or 'long'.")

    # Make a request to GPT
    response = openai.completions.create(
        model="text-davinci-002",
        prompt=prompt,
        max_tokens=response_length, 
    )

    return response.choices[0].text.strip()

def main():
    parser = argparse.ArgumentParser(description="Convert text to Markdown style using GPT")
    parser.add_argument("input_file", nargs="?", default=default_input_file, help="Path to the input text file")
    parser.add_argument("--response_length", choices=["summary", "regular", "long"], default="regular", 
                        help="Response length (summary, regular, long) [default: regular]")

    args = parser.parse_args()

    last_length = 0

    while True:
        with open(args.input_file, 'r') as file:
            text = file.read()
            if len(text) > last_length + chars_before_update:
                #since text has grown, lets update the text.
                markdown_text = convert_to_markdown(text, args.response_length)
                print(markdown_text)
                last_length = len(text)
            
            if len(text) < last_length:
                # The text got shorter, reset the last_length
                last_length = len(text)
        time.sleep(15)    
        #await asyncio.sleep(30) # await for 30 seconds (no given task, may be used for other tasks)

if __name__ == "__main__":
    main()
