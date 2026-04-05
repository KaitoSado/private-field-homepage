export function paintMathBackground(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fcfcf9");
  gradient.addColorStop(0.5, "#f6f8f6");
  gradient.addColorStop(1, "#fdf8ef");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

export function drawGraphGrid(context, width, height, xRange, yRange) {
  context.save();
  context.strokeStyle = "rgba(148, 163, 184, 0.14)";
  context.lineWidth = 1;

  for (let x = -xRange; x <= xRange; x += 1) {
    const screenX = worldToScreenX(x, width, xRange);
    context.beginPath();
    context.moveTo(screenX, 0);
    context.lineTo(screenX, height);
    context.stroke();
  }

  for (let y = -yRange; y <= yRange; y += 1) {
    const screenY = worldToScreenY(y, height, yRange);
    context.beginPath();
    context.moveTo(0, screenY);
    context.lineTo(width, screenY);
    context.stroke();
  }

  context.strokeStyle = "rgba(15, 23, 42, 0.35)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, worldToScreenY(0, height, yRange));
  context.lineTo(width, worldToScreenY(0, height, yRange));
  context.moveTo(worldToScreenX(0, width, xRange), 0);
  context.lineTo(worldToScreenX(0, width, xRange), height);
  context.stroke();
  context.restore();
}

export function drawFunctionCurve(context, fn, xRange, yRange, options = {}) {
  const { canvas } = context;
  context.save();
  context.strokeStyle = options.strokeStyle || "#0f766e";
  context.lineWidth = options.lineWidth || 3;
  context.beginPath();
  let open = false;

  for (let pixel = 0; pixel <= canvas.width; pixel += 1) {
    const x = screenToWorldX(pixel, canvas.width, xRange);
    const y = fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > yRange * 4) {
      open = false;
      continue;
    }

    const screenY = worldToScreenY(y, canvas.height, yRange);
    if (!open) {
      context.moveTo(pixel, screenY);
      open = true;
    } else {
      context.lineTo(pixel, screenY);
    }
  }

  context.stroke();
  context.restore();
}

export function drawCanvasMessage(context, width, height, message) {
  context.save();
  context.fillStyle = "#1f2937";
  context.font = "600 22px var(--font-sans, sans-serif)";
  context.fillText(message, 36, height / 2);
  context.restore();
}

export function eventToCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

export function worldToScreenX(value, width, xRange) {
  return ((value + xRange) / (xRange * 2)) * width;
}

export function worldToScreenY(value, height, yRange) {
  return height - ((value + yRange) / (yRange * 2)) * height;
}

export function screenToWorldX(value, width, xRange) {
  return (value / width) * (xRange * 2) - xRange;
}

export function screenToWorldY(value, height, yRange) {
  return ((height - value) / height) * (yRange * 2) - yRange;
}

export function linearWorldToScreen(x, y, width, height, range) {
  const scale = Math.min(width, height) / (range * 2);
  return {
    x: width / 2 + x * scale,
    y: height / 2 - y * scale
  };
}

export function linearScreenToWorld(x, y, width, height, range) {
  const scale = Math.min(width, height) / (range * 2);
  return {
    x: (x - width / 2) / scale,
    y: -(y - height / 2) / scale
  };
}
