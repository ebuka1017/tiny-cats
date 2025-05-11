import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const chat = ai.chats.create({
  model: 'gemini-2.0-flash-exp',
  config: { responseModalities: ['TEXT', 'IMAGE'] },
});

const userInput = document.querySelector('#input') as HTMLTextAreaElement | null;
const submitButton = document.querySelector('#submit-button') as HTMLButtonElement | null;
const modelOutput = document.querySelector('#output') as HTMLDivElement | null;
const slideshow = document.querySelector('#slideshow') as HTMLDivElement | null;
const error = document.querySelector('#error') as HTMLDivElement | null;
const examples = document.querySelector('#examples') as HTMLUListElement | null;

const instructions = `
Use a fun story about lots of tiny cats as a metaphor.
Keep sentences short but conversational, casual, and engaging.
Generate a cute, minimal illustration for each sentence with black ink on white background.
No commentary, just begin your explanation.
Keep going until you're done.`;

async function addSlide(text: string, image: HTMLImageElement) {
  if (!slideshow) return;
  const slide = document.createElement('div');
  slide.className = 'slide';
  slide.appendChild(image);
  const caption = document.createElement('div');
  
  // ensure we get a string from marked.parse
  caption.innerHTML = marked.parse(text).toString();
  slide.appendChild(caption);
  slideshow.appendChild(slide);
}

async function handleUserInput(input ? : string) {
  if (!slideshow || !modelOutput || !error) return;
  
  // if no input is provided, use the value from the text area
  const userPrompt = input || (userInput ? userInput.value : '');
  if (!userPrompt) return;
  
  slideshow.innerHTML = '';
  slideshow.hidden = true;
  error.hidden = true;
  modelOutput.innerHTML = 'generating tiny cats...';
  
  try {
    // create the contentUnion object properly
    const result = await chat.sendMessageStream({
      contents: [{
        role: 'user',
        parts: [{ text: userPrompt + instructions }]
      }]
    });
    
    for await (const chunk of result) {
      if (!chunk.candidates || chunk.candidates.length === 0) continue;
      
      const candidate = chunk.candidates[0];
      if (!candidate?.content?.parts || candidate.content.parts.length === 0) continue;
      
      const parts = candidate.content.parts;
      
      // handle text and image parts
      let text = '';
      let imageData = '';
      let mimeType = '';
      
      for (const part of parts) {
        if ('text' in part && typeof part.text === 'string') {
          text = part.text;
        } else if ('inlineData' in part && part.inlineData) {
          imageData = part.inlineData.data || '';
          mimeType = part.inlineData.mimeType || '';
        }
      }
      
      if (text && imageData && mimeType) {
        const image = document.createElement('img');
        image.src = `data:${mimeType};base64,${imageData}`;
        await addSlide(text, image);
      }
    }
    
    modelOutput.innerHTML = '';
    slideshow.hidden = false;
  } catch (err) {
    modelOutput.innerHTML = '';
    error.hidden = false;
    error.textContent = err instanceof Error ? err.message : String(err);
    console.error(err);
  }
}

// add event listeners
userInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleUserInput();
  }
});

submitButton?.addEventListener('click', () => {
  handleUserInput();
});

// add click handlers for examples
examples?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.tagName === 'LI') {
    const exampleText = target.textContent;
    if (userInput && exampleText) {
      userInput.value = exampleText;
      handleUserInput(exampleText);
    }
  }
});