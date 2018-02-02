var canvas                     = document.getElementById('canvas'),
    context                    = canvas.getContext('2d'),
    canvasHeight               = canvas.height,
    canvasWidth                = canvas.width,
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

canvas = $('#canvas');
context.transform(1, 0, 0, -1, 0, canvasHeight); // to make the origin (0, 0) at the bottom left of the canvas

$(document).ready(function () {
	$('h1:first').remove();

	canvas.on('contextmenu', function () { // prevent right click context menu from popping up in the canvas
		return false;
	});
});