ImageData.prototype.getPixel = function(x, y) {
	var base = (y * (this.width * 4)) + (x*4);
	
	return {
		r: this.data[base + 0],
		g: this.data[base + 1],
		b: this.data[base + 2],
		a: this.data[base + 3]
	};
}

ImageData.prototype.setPixel = function(x, y, pixel) {
	if (typeof(pixel) == "number") {
		pixel = {
			r: pixel,
			g: pixel,
			b: pixel,
			a: 255
		};
	}
	
	var base = (y * (this.width * 4)) + (x*4);
	
	this.data[base + 0] = pixel.r;
	this.data[base + 1] = pixel.g;
	this.data[base + 2] = pixel.b;
	this.data[base + 3] = pixel.a;
}

function Uint8Matrix (width, height) {
	if (typeof(width) == "number") {
		this.width = width;
		this.height = height;
		this.data = new Uint8ClampedArray(width * height);
	} else {
		var matrix = width;
		this.width = matrix.width;
		this.height = matrix.height;
		this.data = new Uint8ClampedArray(matrix.data);
	}
}

Uint8Matrix.prototype.getCell = function(x, y) {
	return this.data[y*this.width + x];
}

Uint8Matrix.prototype.putCell = function(x, y, value) {
	this.data[y * this.width + x] = value;
}

var Carver = {
	desaturate: function(imageData) {
		var p, c;
		var result = new Uint8Matrix(imageData.width, imageData.height);
		
		for (var y = 0; y < imageData.height; y++) {
			for (var x = 0; x < imageData.width; x++) {
				p = imageData.getPixel(x, y);
				c = this.util.desaturate(p.r, p.g, p.b);
				
				result.putCell(x, y, c);
			}
		}
		
		return result;
	},
	sobel: function(bwmatrix) {
		return this.util.convolve(bwmatrix, [[0, 1, 0], [1, -4, 1], [0, 1, 0]]);
	},
	max: function(bwmatrix) {
		var x, y, dx, dy, max, v;
		var copy = new Uint8Matrix(bwmatrix);
		for (x = 1; x < bwmatrix.width - 1; x++) {
			for (y = 1; y < bwmatrix.height - 1; y++) {
				max = 0;
				for (dx = -1; dx <= 1; dx++) {
					for (dy = -1; dy <= 1; dy++) {
						v = bwmatrix.getCell(x+dx, y+dy);
						max = max > v ? max : v;
					}
				}
				copy.putCell(x, y, max);
			}
		}
		
		return copy;	
	},
	util: {
		desaturate: function (r, g, b) {
			return r * 0.21 + g * 0.72 + b * 0.07;
		},
		convolve: function(matrix, kernel) {
			var total, x, y, dx, dy;
			
			var m = [].concat(kernel[0], kernel[1], kernel[2]);
			var divisor = m.reduce(function(a, b) { return a+b;}) || 1;
			
			var copy = new Uint8Matrix(matrix);
			
			for (x = 1; x < matrix.width-1; x++) {
				for (y = 1; y < matrix.height-1; y++) {
					total = 0;
					for (dx = 0; dx < 3; dx++) {
						for (dy = 0; dy < 3; dy++) {
							total += kernel[dx][dy] * matrix.getCell(x + dx - 1, y + dy - 1);
						}
					}
					copy.putCell(x, y, total);
				}
			}
			
			return copy;
		}
	}
};

var img = new Image();

img.onload = function() {
	var canvas = document.getElementById("carver");
	var context = canvas.getContext("2d");
	canvas.width = img.width;
	canvas.height = img.height;
	
	context.drawImage(img, 0, 0);
	
	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	var desat = Carver.desaturate(imageData);
	var sobel = Carver.sobel(desat);
	var max = Carver.max(sobel);
	
	for (var x = 0; x < imageData.width; x++) {
		for (var y = 0; y < imageData.height; y++) {
			imageData.setPixel(x, y, max.getCell(x, y));
		}
	}
	
	context.putImageData(imageData, 0, 0);
}

img.src = 'tower.png';