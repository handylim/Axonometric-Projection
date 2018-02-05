var canvas                     = document.getElementById('canvas'),
    context                    = canvas.getContext('2d'),
    canvasHeight               = canvas.height,
    canvasWidth                = canvas.width,
    vertices                   = [],
    edges                      = [],
    /* screenTransformationMatrix = (matrixOfPointsAtViewCoordinateSystem ^ -1) * matrixOfPointsAtScreenCoordinateSystem
     * For more details:
     * https://www.symbolab.com/solver/matrix-multiply-calculator/%5Cbegin%7Bpmatrix%7D0%260%261%5C%5C%20%20%20-2%262%261%5C%5C%20%20%20-2%26-2%261%5Cend%7Bpmatrix%7D%5E%7B-1%7D%5Cbegin%7Bpmatrix%7D325%26325%261%5C%5C%20%20%200%26650%261%5C%5C%20%20%200%260%261%5Cend%7Bpmatrix%7D
     */
    screenTransformationMatrix = [
	    [162.5, 0, 0, 0],
	    [0, 162.5, 0, 0],
	    [0, 0, 0, 0],
	    [325, 325, 0, 1]
    ],
    screenTransformationResult;

function Vertex (x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
	this.w = 1;
}

function Edge (startPointIndex, endPointIndex) {
	this.startPointIndex = startPointIndex;
	this.endPointIndex = endPointIndex;
}

function Vector (x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
}

function Rotation (x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
}

function clearCanvas () {
	context.clearRect(0, 0, canvasWidth, canvasHeight);
}

function draw () {
	clearCanvas();
	for (var i = edges.length - 1; i >= 0; i--) {
		context.beginPath();
		context.moveTo(screenTransformationResult[edges[i].startPointIndex].x, screenTransformationResult[edges[i].startPointIndex].y);
		context.lineTo(screenTransformationResult[edges[i].endPointIndex].x, screenTransformationResult[edges[i].endPointIndex].y);
		// set line color
		context.lineWidth = 2;
		context.strokeStyle = i < 4 ? '#f00' : '#000';
		context.stroke();
	}
}

function convertVerticesToMatrix (vertices) {
	if (vertices[0].constructor === Array) // check whether vertices is a matrix or not
		return vertices;
	else { // vertices is a list of vertices
		var result = new Array(vertices.length); // initialize array of rows
		for (i = 0; i < vertices.length; i++) { // convert it to matrix
			result[i] = new Array(4); // initialize current row with 4 columns for x, y, z, and w
			result[i][0] = vertices[i].x;
			result[i][1] = vertices[i].y;
			result[i][2] = vertices[i].z;
			result[i][3] = vertices[i].w;
		}

		return result;
	}
}

function convertMatrixToVertices (matrix) {
	if (matrix[0].constructor === Array) { // check whether matrix is a matrix or not
		var result = [];
		for (var i = 0; i < matrix.length; i++) {
			result.push({
				            x : matrix[i][0],
				            y : matrix[i][1],
				            z : matrix[i][2],
				            w : matrix[i][3]
			            });

			if (matrix[i][3] !== 1)
				console.warn('The w of the vertex is not 1. This point might not be a homogeneous coordinate');
		}

		return result;
	}
	else
		return matrix;
}

function multiplyMatrix (a, b) {
	if (a[0].length !== b.length)
		throw new Error('Can\'t multiply the matrix');

	var result = new Array(a.length); // initialize array of rows
	for (var i = 0; i < a.length; i++) {
		result[i] = new Array(b[0].length).fill(0); // initialize current row with columns with value zeroes
		for (var j = 0; j < b[0].length; j++)
			for (var k = 0; k < a[0].length; k++)
				result[i][j] += a[i][k] * b[k][j];
	}

	return result;
}

function normalizeVector (x, y, z) {
	var length = Math.sqrt(x * x + y * y + z * z);

	return new Vector(x / length, y / length, z / length);
}

function findNormalizationAxisMatrix (vector) {
	var d = Math.sqrt(vector.y * vector.y + vector.z * vector.z);

	return multiplyMatrix([
		                      [1, 0, 0, 0],
		                      [0, vector.z / d, vector.y / d, 0],
		                      [0, -1 * vector.y / d, vector.z / d, 0],
		                      [0, 0, 0, 1]
	                      ], [
		                      [d, 0, vector.x, 0],
		                      [0, 1, 0, 0],
		                      [-1 * vector.x, 0, d, 0],
		                      [0, 0, 0, 1]
	                      ]);
}

function findDenormalizationAxisMatrix (vector) {
	var d = Math.sqrt(vector.y * vector.y + vector.z * vector.z);

	return multiplyMatrix([
		                      [d, 0, -1 * vector.x, 0],
		                      [0, 1, 0, 0],
		                      [vector.x, 0, d, 0],
		                      [0, 0, 0, 1]
	                      ], [
		                      [1, 0, 0, 0],
		                      [0, vector.z / d, -1 * vector.y / d, 0],
		                      [0, vector.y / d, vector.z / d, 0],
		                      [0, 0, 0, 1]
	                      ]);
}

function findRotationMatrix (x, y, z) {
	// convert from degree to radian
	x *= Math.PI / 180;
	y *= Math.PI / 180;
	z *= Math.PI / 180;

	var result = [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1]
	];

	if (x !== 0)
		result = multiplyMatrix(result, [
			[1, 0, 0, 0],
			[0, Math.cos(x), Math.sin(x), 0],
			[0, -1 * Math.sin(x), Math.cos(x), 0],
			[0, 0, 0, 1]
		]);

	if (y !== 0)
		result = multiplyMatrix(result, [
			[Math.cos(y), 0, -1 * Math.sin(y), 0],
			[0, 1, 0, 0],
			[Math.sin(y), 0, Math.cos(y), 0],
			[0, 0, 0, 1]
		]);

	if (z !== 0)
		result = multiplyMatrix(result, [
			[Math.cos(z), Math.sin(z), 0, 0],
			[-1 * Math.sin(z), Math.cos(z), 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		]);

	return result;
}

function rotate (xCube, yCube, zCube, xCamera, yCamera, zCamera) {
	var worldCoordinateSystemPosition, viewCoordinateSystemPosition, screenCoordinateSystemPosition;

	worldCoordinateSystemPosition = multiplyMatrix(convertVerticesToMatrix(vertices), findRotationMatrix(xCube, yCube, zCube));
	viewCoordinateSystemPosition = multiplyMatrix(worldCoordinateSystemPosition, findRotationMatrix(xCamera, yCamera, zCamera));
	screenCoordinateSystemPosition = multiplyMatrix(viewCoordinateSystemPosition, screenTransformationMatrix);

	return screenCoordinateSystemPosition;
}

function rotateOnArbitraryAxis (normalizedVertices, teta, denormalizationAxisMatrix) {
	var viewCoordinateSystemPosition, denormalizedVertices, screenCoordinateSystemPosition;

	viewCoordinateSystemPosition = multiplyMatrix(normalizedVertices, findRotationMatrix(0, 0, teta));
	denormalizedVertices = multiplyMatrix(viewCoordinateSystemPosition, denormalizationAxisMatrix);
	screenCoordinateSystemPosition = multiplyMatrix(denormalizedVertices, screenTransformationMatrix);

	return screenCoordinateSystemPosition;
}

canvas = $('#canvas');
context.transform(1, 0, 0, -1, 0, canvasHeight); // to make the origin (0, 0) at the bottom left of the canvas

vertices.push(new Vertex(-1, -1, 1));
vertices.push(new Vertex(1, -1, 1));
vertices.push(new Vertex(1, 1, 1));
vertices.push(new Vertex(-1, 1, 1));
vertices.push(new Vertex(-1, -1, -1));
vertices.push(new Vertex(1, -1, -1));
vertices.push(new Vertex(1, 1, -1));
vertices.push(new Vertex(-1, 1, -1));

edges.push(new Edge(0, 1));
edges.push(new Edge(1, 2));
edges.push(new Edge(2, 3));
edges.push(new Edge(3, 0));
edges.push(new Edge(4, 5));
edges.push(new Edge(5, 6));
edges.push(new Edge(6, 7));
edges.push(new Edge(7, 4));
edges.push(new Edge(0, 4));
edges.push(new Edge(1, 5));
edges.push(new Edge(2, 6));
edges.push(new Edge(3, 7));

$(document).ready(function () {
	$('h1:first').remove();
	screenTransformationResult = convertMatrixToVertices(rotate(0, 0, 0, 0, 0, 0));
	draw();

	canvas.on('contextmenu', function () { // prevent right click context menu from popping up in the canvas
		return false;
	});
});