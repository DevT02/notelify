# Prompt Engineering

import openai
import argparse
from config import OPENAI_API_KEY
# Must Define key

input_prompt = ""
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
    response = openai.Completion.create(
        engine="text-davinci-002",
        prompt=prompt,
        max_tokens=response_length  # Adjust this as needed to control the response length
    )

    return response.choices[0].text.strip()

def main():
    parser = argparse.ArgumentParser(description="Convert text to Markdown style using GPT")
    parser.add_argument("input_file", help="Path to the input text file")
    parser.add_argument("--response_length", choices=["summary", "regular", "long"], default="regular", 
                        help="Response length (summary, regular, long) [default: regular]")

    args = parser.parse_args()

    with open(args.input_file, 'r') as file:
        text = file.read()

    while text:
        markdown_text = convert_to_markdown(text, args.response_length)
        print(markdown_text)

        text = file.read()

if __name__ == "__main__":
    main()
