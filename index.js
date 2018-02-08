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
    screenTransformationResult,
    animation                  = null;

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

function rotateOnArbitraryAxis (normalizedVertices, theta, denormalizationAxisMatrix) {
	var viewCoordinateSystemPosition, denormalizedVertices, screenCoordinateSystemPosition;

	viewCoordinateSystemPosition = multiplyMatrix(normalizedVertices, findRotationMatrix(0, 0, theta));
	denormalizedVertices = multiplyMatrix(viewCoordinateSystemPosition, denormalizationAxisMatrix);
	screenCoordinateSystemPosition = multiplyMatrix(denormalizedVertices, screenTransformationMatrix);

	return screenCoordinateSystemPosition;
}

function rotateAnimation (rotationAxis, xCube, yCube, zCube, xCamera, yCamera, zCamera) {
	var worldCoordinateSystemPosition, viewCoordinateSystemPosition, screenCoordinateSystemPosition;

	worldCoordinateSystemPosition = multiplyMatrix(convertVerticesToMatrix(vertices), findRotationMatrix(xCube, yCube, zCube));
	viewCoordinateSystemPosition = multiplyMatrix(worldCoordinateSystemPosition, findRotationMatrix(xCamera, yCamera, zCamera));
	screenCoordinateSystemPosition = multiplyMatrix(viewCoordinateSystemPosition, screenTransformationMatrix);

	screenTransformationResult = convertMatrixToVertices(screenCoordinateSystemPosition);
	draw();

	switch (rotationAxis) {
		case 'xCube':
			xCube <= 350 ? xCube += 10 : xCube = 0;
			break;
		case 'yCube':
			yCube <= 350 ? yCube += 10 : yCube = 0;
			break;
		case 'zCube':
			zCube <= 350 ? zCube += 10 : zCube = 0;
			break;
		case 'xCamera':
			xCamera <= 350 ? xCamera += 10 : xCamera = 0;
			break;
		case 'yCamera':
			yCamera <= 350 ? yCamera += 10 : yCamera = 0;
			break;
		case 'zCamera':
			zCamera <= 350 ? zCamera += 10 : zCamera = 0;
			break;
	}

	animation = setTimeout(rotateAnimation, 100, rotationAxis, xCube, yCube, zCube, xCamera, yCamera, zCamera);
}

function rotateOnArbitraryAxisAnimation (normalizedVertices, theta, denormalizationAxisMatrix) {
	screenTransformationResult = convertMatrixToVertices(rotateOnArbitraryAxis(normalizedVertices, theta, denormalizationAxisMatrix));
	draw();
	theta <= 350 ? theta += 10 : theta = 0;
	animation = setTimeout(rotateOnArbitraryAxisAnimation, 100, normalizedVertices, theta, denormalizationAxisMatrix);
}

function stopCubeAnimation (buttonRotateCube, buttonStopCubeAnimation) {
	clearTimeout(animation);
	$('input[type=radio][name=animateCube]').prop('checked', false);
	buttonRotateCube.removeClass('d-none');
	buttonStopCubeAnimation.addClass('d-none');
}

function stopCameraAnimation (buttonRotateCamera, buttonStopCameraAnimation) {
	clearTimeout(animation);
	$('input[type=radio][name=animateCamera]').prop('checked', false);
	buttonRotateCamera.removeClass('d-none');
	buttonStopCameraAnimation.addClass('d-none');
}

function stopRotateOnArbitraryAxisAnimation (buttonRotateOnArbitraryAxis, buttonStopRotateOnArbitraryAxisAnimation) {
	clearTimeout(animation);
	$('#isRotateOnArbitraryAxisAnimate').prop('checked', false);
	buttonRotateOnArbitraryAxis.removeClass('d-none');
	buttonStopRotateOnArbitraryAxisAnimation.addClass('d-none');
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
	$('input[type=text]').val('');
	$('input[type=radio], input[type=checkbox]').prop('checked', false);

	var buttonRotateCube                         = $('#btnRotateCube'),
	    buttonRotateCamera                       = $('#btnRotateCamera'),
	    buttonRotateOnArbitraryAxis              = $('#btnRotateOnArbitraryAxis'),
	    buttonStopCubeAnimation                  = $('#btnStopCubeAnimation'),
	    buttonStopCameraAnimation                = $('#btnStopCameraAnimation'),
	    buttonStopRotateOnArbitraryAxisAnimation = $('#btnStopRotateOnArbitraryAxisAnimation'),
	    rotateCubeInputs                         = $('input[type=text][name=rotateCube].form-control'),
	    rotateCameraInputs                       = $('input[type=text][name=rotateCamera].form-control'),
	    rotateOnArbitraryAxisInputs              = $('input[type=text][name=rotateOnArbitraryAxis].form-control'),
	    cubeRotation                             = new Rotation (0, 0, 0),
	    cameraRotation                           = new Rotation (0, 0, 0),
	    isCubeRotationChanged,
	    isCameraRotationChanged;

	rotateCubeInputs.on('input', function () {
		var isInvalid      = isNaN($(this).val().trim()),
		    errorContainer = $(this).siblings('div.invalid-feedback');

		errorContainer.html(errorContainer.data('invalidMessage'));
		isInvalid ? $(this).addClass('is-invalid') : $(this).removeClass('is-invalid');
		buttonRotateCube.prop('disabled', isInvalid);
		isCubeRotationChanged = true;
	});

	rotateCameraInputs.on('input', function () {
		var isInvalid      = isNaN($(this).val().trim()),
		    errorContainer = $(this).siblings('div.invalid-feedback');

		errorContainer.html(errorContainer.data('invalidMessage'));
		isInvalid ? $(this).addClass('is-invalid') : $(this).removeClass('is-invalid');
		buttonRotateCamera.prop('disabled', isInvalid);
		isCameraRotationChanged = true;
	});

	rotateOnArbitraryAxisInputs.on('input', function () {
		var isInvalid      = isNaN($(this).val().trim()),
		    errorContainer = $(this).siblings('div.invalid-feedback');

		errorContainer.html(errorContainer.data('invalidMessage'));
		isInvalid ? $(this).addClass('is-invalid') : $(this).removeClass('is-invalid');
		buttonRotateOnArbitraryAxis.prop('disabled', isInvalid);
	});

	$('input[type=radio][name=animateCube]').on('change', function () {
		stopCameraAnimation(buttonRotateCamera, buttonStopCameraAnimation);
		stopRotateOnArbitraryAxisAnimation(buttonRotateOnArbitraryAxis, buttonStopRotateOnArbitraryAxisAnimation);
		rotateCubeInputs.prop('disabled', true);
		rotateCubeInputs.removeClass('is-invalid');
		var rotationAxis;
		if ($(this).prop('id') === 'animateCubeX')
			rotationAxis = 'xCube';
		else if ($(this).prop('id') === 'animateCubeY')
			rotationAxis = 'yCube';
		else if ($(this).prop('id') === 'animateCubeZ')
			rotationAxis = 'zCube';

		animation = setTimeout(rotateAnimation, 100, rotationAxis, 0, 0, 0, 0, 0, 0);
		buttonRotateCube.addClass('d-none');
		buttonStopCubeAnimation.removeClass('d-none');
	});

	$('input[type=radio][name=animateCamera]').on('change', function () {
		stopCubeAnimation(buttonRotateCube, buttonStopCubeAnimation);
		stopRotateOnArbitraryAxisAnimation(buttonRotateOnArbitraryAxis, buttonStopRotateOnArbitraryAxisAnimation);
		rotateCameraInputs.prop('disabled', true);
		rotateCameraInputs.removeClass('is-invalid');
		var rotationAxis;
		if ($(this).prop('id') === 'animateCameraX')
			rotationAxis = 'xCamera';
		else if ($(this).prop('id') === 'animateCameraY')
			rotationAxis = 'yCamera';
		else if ($(this).prop('id') === 'animateCameraZ')
			rotationAxis = 'zCamera';

		animation = setTimeout(rotateAnimation, 100, rotationAxis, 0, 0, 0, 0, 0, 0);
		buttonRotateCamera.addClass('d-none');
		buttonStopCameraAnimation.removeClass('d-none');
	});

	buttonRotateCube.on('click', function () {
		var isValid = true;
		rotateCubeInputs.each(function () {
			var errorContainer;
			if ($(this).val() === '') {
				isValid = false;
				errorContainer = $(this).siblings('div.invalid-feedback');
				errorContainer.html(errorContainer.data('requiredMessage'));
				isValid ? $(this).removeClass('is-invalid') : $(this).addClass('is-invalid');
			}
		});

		if (!isValid)
			return false;

		clearTimeout(animation);

		if (isCubeRotationChanged) {
			cubeRotation.x = parseInt($('#rotateCubeX').val().trim(), 10);
			cubeRotation.y = parseInt($('#rotateCubeY').val().trim(), 10);
			cubeRotation.z = parseInt($('#rotateCubeZ').val().trim(), 10);
			isCubeRotationChanged = false;
		}
		else {
			cubeRotation.x += parseInt($('#rotateCubeX').val().trim(), 10);
			cubeRotation.y += parseInt($('#rotateCubeY').val().trim(), 10);
			cubeRotation.z += parseInt($('#rotateCubeZ').val().trim(), 10);
		}

		screenTransformationResult = convertMatrixToVertices(rotate(cubeRotation.x, cubeRotation.y, cubeRotation.z, cameraRotation.x, cameraRotation.y, cameraRotation.z));
		draw();
	});

	buttonRotateCamera.on('click', function () {
		var isValid = true;
		rotateCameraInputs.each(function () {
			var errorContainer;
			if ($(this).val() === '') {
				isValid = false;
				errorContainer = $(this).siblings('div.invalid-feedback');
				errorContainer.html(errorContainer.data('requiredMessage'));
				isValid ? $(this).removeClass('is-invalid') : $(this).addClass('is-invalid');
			}
		});

		if (!isValid)
			return false;

		clearTimeout(animation);

		if (isCameraRotationChanged) {
			cameraRotation.x = parseInt($('#rotateCameraX').val().trim(), 10);
			cameraRotation.y = parseInt($('#rotateCameraY').val().trim(), 10);
			cameraRotation.z = parseInt($('#rotateCameraZ').val().trim(), 10);
			isCameraRotationChanged = false;
		}
		else {
			cameraRotation.x += parseInt($('#rotateCameraX').val().trim(), 10);
			cameraRotation.y += parseInt($('#rotateCameraY').val().trim(), 10);
			cameraRotation.z += parseInt($('#rotateCameraZ').val().trim(), 10);
		}

		screenTransformationResult = convertMatrixToVertices(rotate(cubeRotation.x, cubeRotation.y, cubeRotation.z, cameraRotation.x, cameraRotation.y, cameraRotation.z));
		draw();
	});

	buttonRotateOnArbitraryAxis.on('click', function () {
		var isValid = true;
		rotateOnArbitraryAxisInputs.each(function () {
			var errorContainer;
			if ($(this).val() === '' && (!$('#isRotateOnArbitraryAxisAnimate').is(':checked') || $(this).prop('id') !== 'rotateOnArbitraryAxisTheta')) {
				isValid = false;
				errorContainer = $(this).siblings('div.invalid-feedback');
				errorContainer.html(errorContainer.data('requiredMessage'));
				isValid ? $(this).removeClass('is-invalid') : $(this).addClass('is-invalid');
			}
		});

		if (!isValid)
			return false;

		stopCubeAnimation(buttonRotateCube, buttonStopCubeAnimation);
		stopCameraAnimation(buttonRotateCamera, buttonStopCameraAnimation);
		var x     = parseInt($('#rotateOnArbitraryAxisX').val(), 10),
		    y     = parseInt($('#rotateOnArbitraryAxisY').val(), 10),
		    z     = parseInt($('#rotateOnArbitraryAxisZ').val(), 10),
		    theta = parseInt($('#rotateOnArbitraryAxisTheta').val(), 10);

		if (y === 0 && z === 0) // this will cause d = 0 in the normalization axis matrix, thus lead to division by zero error
			if ($('#isRotateOnArbitraryAxisAnimate').is(':checked')) {
				rotateOnArbitraryAxisInputs.prop('disabled', true);
				animation = setTimeout(rotateAnimation, 100, 'xCube', 0, 0, 0, 0, 0, 0); // simply animate the rotation on x-axis
				buttonRotateOnArbitraryAxis.addClass('d-none');
				buttonStopRotateOnArbitraryAxisAnimation.removeClass('d-none');
			}
			else {
				var worldCoordinateSystemPosition, screenCoordinateSystemPosition;
				worldCoordinateSystemPosition = multiplyMatrix(convertVerticesToMatrix(vertices), findRotationMatrix(theta, 0, 0));
				screenCoordinateSystemPosition = multiplyMatrix(worldCoordinateSystemPosition, screenTransformationMatrix); // don't need viewCoordinateSystemPosition because the camera doesn't move

				screenTransformationResult = convertMatrixToVertices(screenCoordinateSystemPosition);
				draw();
			}
		else {
			var vector                    = normalizeVector(x, y, z),
			    normalizationAxisMatrix   = findNormalizationAxisMatrix(vector),
			    denormalizationAxisMatrix = findDenormalizationAxisMatrix(vector),
			    normalizedVertices        = multiplyMatrix(convertVerticesToMatrix(vertices), normalizationAxisMatrix);

			if ($('#isRotateOnArbitraryAxisAnimate').is(':checked')) {
				rotateOnArbitraryAxisInputs.prop('disabled', true);
				animation = setTimeout(rotateOnArbitraryAxisAnimation, 100, normalizedVertices, 0, denormalizationAxisMatrix);
				buttonRotateOnArbitraryAxis.addClass('d-none');
				buttonStopRotateOnArbitraryAxisAnimation.removeClass('d-none');
			}
			else {
				screenTransformationResult = convertMatrixToVertices(rotateOnArbitraryAxis(normalizedVertices, theta, denormalizationAxisMatrix));
				draw();
			}
		}
	});

	buttonStopCubeAnimation.on('click', function () {
		stopCubeAnimation(buttonRotateCube, buttonStopCubeAnimation);
		rotateCubeInputs.prop('disabled', false);
	});
	buttonStopCameraAnimation.on('click', function () {
		stopCameraAnimation(buttonRotateCamera, buttonStopCameraAnimation);
		rotateCameraInputs.prop('disabled', false);
	});
	buttonStopRotateOnArbitraryAxisAnimation.on('click', function () {
		stopRotateOnArbitraryAxisAnimation(buttonRotateOnArbitraryAxis, buttonStopRotateOnArbitraryAxisAnimation);
		rotateOnArbitraryAxisInputs.prop('disabled', false);
	});

	canvas.on('contextmenu', function () { // prevent right click context menu from popping up in the canvas
		return false;
	});
});