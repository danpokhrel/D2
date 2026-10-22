const app = document.querySelector<HTMLElement>("#app")!;

const heading = document.createElement("h1");
heading.textContent = "D2 project";

const message = document.createElement("p");
message.textContent = "Click and drag to draw!";

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 200;

/*
 * A lot of this beginning structure was paraphrased from the QuantPaint assignment.
 * https://github.com/rndmcnlly/cmpm-121-f25-quaint-paint/blob/main/paint0.html
 * The code was not directly copied, but some of it's logic and structure was used as reference.
 */

const canvas = document.createElement("canvas");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const context = canvas.getContext("2d")!;

interface mouseData {
  x: number;
  y: number;
  clicked: boolean;
}
const mouse: mouseData = { x: 0, y: 0, clicked: false };

canvas.addEventListener("mousedown", GetMouseData);
canvas.addEventListener("mouseup", GetMouseData);

canvas.addEventListener("mousemove", Draw);

function GetMouseData(data: MouseEvent) {
  mouse.x = data.offsetX;
  mouse.y = data.offsetY;
  mouse.clicked = data.buttons == 1; // If left click specifically is pressed
  // console.log("Button pressed: " + data.buttons);
}

function Draw(data: MouseEvent) {
  if (mouse.clicked == true) {
    context.beginPath();
    context.moveTo(mouse.x, mouse.y);
    context.lineTo(data.offsetX, data.offsetY);
    context.stroke();
  }
  GetMouseData(data);
}

const clearButt = document.createElement("button");
clearButt.textContent = "Erase All";
clearButt.addEventListener("click", Clear);

function Clear() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

app.append(heading, message, canvas, clearButt);
