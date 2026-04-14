// Processing render source for /apps/generative-art-with-math.
// Based on GenerativeArtWithMath/ProcessingSketches/SpiralPolygonBezierLite.

float theta;

final float STEP = TWO_PI * 0.01;
final float RENDER_THETA = TWO_PI * 13.8;

final int CONTROL_POINT_NUM = 9;
final int BEZIER_SEGMENTS = 156;
final int SYMMETRY_ORDER = 10;
final int BEZIER_TRAIL_COUNT = 5;

final float CONTROL_POINT_GAP = STEP * 18.0;
final float BEZIER_TRAIL_GAP = STEP * 34.0;
final float START_THETA = CONTROL_POINT_GAP * (CONTROL_POINT_NUM + 5);

void settings() {
  size(1200, 900);
  smooth(8);
}

void setup() {
  colorMode(HSB, 100, 100, 100, 100);
  theta = max(START_THETA, RENDER_THETA);
  renderFrame();

  String outputPath = sketchPath("spiral-polygon-processing.png");
  if (args != null && args.length > 0) {
    outputPath = args[0];
  }

  save(outputPath);
  exit();
}

void draw() {
}

void renderFrame() {
  background(0, 0, 98);
  drawPaperGrid();
  drawFermatAxis(theta);

  for (int i = BEZIER_TRAIL_COUNT - 1; i >= 0; i--) {
    float trailTheta = max(START_THETA, theta - i * BEZIER_TRAIL_GAP);
    float alphaScale = map(i, 0, BEZIER_TRAIL_COUNT - 1, 1.0, 0.38);
    drawSymmetricHigherBezier(getAxisControlPoints(trailTheta), alphaScale);
  }

  PVector[] axisPoints = getAxisControlPoints(theta);
  drawControlPolygon(axisPoints);
  drawControlPoints(axisPoints);
  drawGuide();
}

void drawPaperGrid() {
  stroke(0, 0, 10, 5);
  strokeWeight(1);

  for (int x = 0; x <= width; x += 48) {
    line(x, 0, x, height);
  }

  for (int y = 0; y <= height; y += 48) {
    line(0, y, width, y);
  }
}

float radFermat(float angle) {
  float baseScale = min(width, height) / 500.0;
  return 20.0 * sqrt(max(0, angle)) * baseScale;
}

PVector pointOnFermat(float angle) {
  float radius = radFermat(angle);
  return new PVector(
    width * 0.5 + radius * cos(angle),
    height * 0.5 + radius * sin(angle)
  );
}

void drawFermatAxis(float endTheta) {
  stroke(0, 0, 16, 54);
  strokeWeight(1.25);
  noFill();

  beginShape();
  for (float a = 0; a <= endTheta; a += STEP) {
    PVector p = pointOnFermat(a);
    vertex(p.x, p.y);
  }
  endShape();
}

PVector[] getAxisControlPoints(float headTheta) {
  PVector[] points = new PVector[CONTROL_POINT_NUM];

  for (int i = 0; i < CONTROL_POINT_NUM; i++) {
    float a = max(0, headTheta - (CONTROL_POINT_NUM - 1 - i) * CONTROL_POINT_GAP);
    points[i] = pointOnFermat(a);
  }

  return points;
}

void drawSymmetricHigherBezier(PVector[] axisPoints, float alphaScale) {
  for (int i = 0; i < SYMMETRY_ORDER; i++) {
    float angle = i * TWO_PI / SYMMETRY_ORDER;
    float hue = i * 100.0 / SYMMETRY_ORDER;
    PVector[] rotated = rotatePoints(axisPoints, angle);

    drawBezierCurve(rotated, hue, alphaScale);
  }
}

void drawBezierCurve(PVector[] points, float hue, float alphaScale) {
  stroke(hue, 56, 92, 26 * alphaScale);
  strokeWeight(9.0);
  drawBezierPolyline(points);

  stroke(hue, 88, 25, 88 * alphaScale);
  strokeWeight(2.2);
  drawBezierPolyline(points);
}

void drawBezierPolyline(PVector[] points) {
  noFill();
  beginShape();
  for (int i = 0; i <= BEZIER_SEGMENTS; i++) {
    float t = i / float(BEZIER_SEGMENTS);
    PVector p = bezierPointByDeCasteljau(points, t);
    vertex(p.x, p.y);
  }
  endShape();
}

PVector bezierPointByDeCasteljau(PVector[] points, float t) {
  PVector[] current = copyPoints(points);

  while (current.length > 1) {
    PVector[] next = new PVector[current.length - 1];
    for (int i = 0; i < next.length; i++) {
      next[i] = PVector.lerp(current[i], current[i + 1], t);
    }
    current = next;
  }

  return current[0];
}

PVector[] copyPoints(PVector[] points) {
  PVector[] copied = new PVector[points.length];
  for (int i = 0; i < points.length; i++) {
    copied[i] = points[i].copy();
  }
  return copied;
}

PVector[] rotatePoints(PVector[] points, float angle) {
  PVector[] rotated = new PVector[points.length];
  for (int i = 0; i < points.length; i++) {
    rotated[i] = rotatePoint(points[i], angle);
  }
  return rotated;
}

PVector rotatePoint(PVector point, float angle) {
  float x = point.x - width * 0.5;
  float y = point.y - height * 0.5;
  float c = cos(angle);
  float s = sin(angle);

  return new PVector(
    width * 0.5 + x * c - y * s,
    height * 0.5 + x * s + y * c
  );
}

void drawControlPolygon(PVector[] points) {
  stroke(4, 78, 84, 42);
  strokeWeight(1.4);
  noFill();
  beginShape();
  for (PVector p : points) {
    vertex(p.x, p.y);
  }
  endShape();
}

void drawControlPoints(PVector[] points) {
  noStroke();
  for (int i = 0; i < points.length; i++) {
    float hue = i * 100.0 / points.length;
    fill(hue, 72, 98, 38);
    circle(points[i].x, points[i].y, 22);
    fill(0, 0, 14, 92);
    circle(points[i].x, points[i].y, 6);
  }
}

void drawGuide() {
  noStroke();
  fill(0, 0, 13, 76);
  textSize(18);
  text("Processing render: Fermat spiral axis + deterministic HigherBezier", 28, height - 52);
  text("GenerativeArtWithMath / Ch16 Spiral Polygon", 28, height - 24);
}
