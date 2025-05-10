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
  const caption = document.createElement('p');
  caption.innerHTML = marked(text);
  slide.appendChild(caption);
  slideshow.appendChild(slide);
}

async function handleUserInput() {
  if (!userInput || !slideshow || !modelOutput || !error) return;
  const input = userInput.value;
  if (!input) return;
  
  slideshow.innerHTML = '';
  slideshow.hidden = true;
  error.hidden = true;
  modelOutput.innerHTML = 'Generating tiny cats...';
  
  try {
    for await (const chunk of chat.sendMessageStream(input + instructions)) {
      if (!chunk.candidates?.length) continue;
      const content = chunk.candidates[0]?.content;
      if (!content?.parts?.length) continue;
      
      const text = content.parts[0]?.text ?? '';
      const imageData = content.parts[1]?.inlineData?.data;
      const mimeType = content.parts[1]?.inlineData?.mimeType;
      
      if (text && imageData && mimeType) {
        const image = document.createElement('img');
        image.src = `data:${mimeType};base64,${imageData}`;
        addSlide(text, image);
      }
    }
    
    modelOutput.innerHTML = '';
    slideshow.hidden = false;
  } catch (err) {
    modelOutput.innerHTML = '';
    error.hidden = false;
    error.textContent = (err as Error).message;
  }
}

userInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleUserInput();
  }
});

submitButton?.addEventListener('click', () => {
  if (!userInput) return;
  const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
  userInput.dispatchEvent(enterEvent);
});