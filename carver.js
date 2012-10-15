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

function Uint32Matrix (width, height) {
	this.width = width;
	this.height = height;
	this.data = new Uint32Array(width * height);
}

function Float32Matrix (width, height) {
	if (typeof(width) == "number") {
		this.width = width;
		this.height = height;
		this.data = new Float32Array(width * height);
	} else {
		var matrix = width;
		this.width = matrix.width;
		this.height = matrix.height;
		this.data = new Float32Array(matrix.data);
	}
}

Uint32Matrix.prototype.getCell = function(x, y) {
	return this.data[y*this.width + x];
}

Uint32Matrix.prototype.putCell = function(x, y, value) {
	this.data[y * this.width + x] = value;
}

Float32Matrix.prototype.getCell = function(x, y) {
	return this.data[y*this.width + x];
}

Float32Matrix.prototype.putCell = function(x, y, value) {
	this.data[y * this.width + x] = value;
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
	gaussian: function(bwmatrix) {
		return this.util.convolvesep(bwmatrix, [[[0.006], [0.061], [0.242], [0.383], [0.242], [0.061], [0.006]], [[0.006, 0.061, 0.242, 0.383, 0.242, 0.061, 0.006]]]);
	},
	oldsobel: function(bwmatrix) {
			return this.util.convolve(bwmatrix, [[0, 1, 0], [1, -4, 1], [0, 1, 0]]);
		},
	sobel: function(bwmatrix) {
		var horizontal = [[[1], [2], [1]], [[-1, 0, 1]]];
		var vertical = [[[-1], [0], [1]], [[1, 2, 1]]];
		
		var g1 = this.util.convolvesep(bwmatrix, horizontal);
		var g2 = this.util.convolvesep(bwmatrix, vertical);
		
		for (var i = 0; i < g1.data.length; i++) {
			g1.data[i] = Math.sqrt(Math.pow(g1.data[i], 2) + Math.pow(g2.data[i], 2));
		}
		
		return g1;
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
	cumulativeImportance: function(matrix) {
		var x, y, dir, left, right, up;
		var cumul = new Uint32Matrix(matrix.width, matrix.height);
		var impor = new Uint8Matrix(matrix.width, matrix.height);
		
		// copy first line
		for (x = 0; x < matrix.width; x++) {
			cumul.putCell(x, 0, matrix.getCell(x, 0));
			impor.putCell(x, 0, 0);
		}
		leftisright = 0;
		// step through this thing
		for (y = 1; y < matrix.height; y++) {
			for (x = 0; x < matrix.width; x++) {
				if (x == 0) {
					// only check up and right
					if (cumul.getCell(x, y-1) <= cumul.getCell(x+1, y-1)) {
						dir = 0;
					} else {
						dir = 1;
					}
				} else if (x == matrix.width-1) {
					// only check left and up
					if (cumul.getCell(x, y-1) <= cumul.getCell(x-1, y-1)) {
						dir = 0;
					} else {
						dir = -1;
					}
				} else {
					// check up, left and right. prefer up. if left and right are equal, prefer right, for now. Not sure what do yet.
					up = cumul.getCell(x, y-1);
					left = cumul.getCell(x-1, y-1);
					right = cumul.getCell(x+1, y-1);
					
					if (up <= left && up <= right) {
						dir = 0;
					} else if (left <= up && left < right) {
						dir = -1;
					} else if (right <= up && right < left) {
						dir = 1;
					} else {
						//console.log({left: left, up: up, right: right});
						dir = 0;
					}
				}
				
				impor.putCell(x, y, dir);
				cumul.putCell(x, y, matrix.getCell(x, y) + cumul.getCell(x + dir, y-1));
			}
		}
		
		return {
			impor: impor,
			cumul: cumul
		};
	},
	nonoverlapping: function(minimalrows, directions, count) {
		var width = directions.width;
		var height = directions.height;
		var found = 0;
		var matrix = new Uint8Matrix(width, height);
		
		var i = 0;
		
		while (found < count && i < width) {
			var x = minimalrows[i][0];
			var overlap = false
			
			for (y = height-1; !overlap && y > 0; y--) {
				overlap = matrix.getCell(x, y) == 1;
				x += directions.getCell(x, y);
			}
			
			if (!overlap) {
				found += 1;
				x = minimalrows[i][0];
				for (y = height-1; y > 0; y--) {
					matrix.putCell(x, y, 1);
					x += directions.getCell(x, y);
				}
			}
			
			i++;
		}
		
		return matrix;
	},
	minimalrows: function(cumul) {
		var lastrow = [];
		
		for (var x = 0; x < cumul.width; x++) {
			lastrow.push([x, cumul.getCell(x, cumul.height-1)]);
		}
		
		lastrow = lastrow.sort(function(a, b) {return a[1]-b[1];});
		return lastrow;
	},
	util: {
		desaturate: function (r, g, b) {
			return r * 0.21 + g * 0.72 + b * 0.07;
		},
		convolve: function(matrix, kernel) {
			var total, x, y, dx, dy, width, height;
			
			height = kernel[0].length;
			width = kernel.length;
			
			var halfwidth = (width-1)/2;
			var halfheight = (height-1)/2;
			var divisor = 0;
			
			for (x = 0; x < width; x++) {
				for (y = 0; y < height; y++) {
					divisor += kernel[x][y];
				}
			}
			
			var copy = new Float32Matrix(matrix);
			
			for (x = halfwidth; x < matrix.width-halfwidth; x++) {
				for (y = halfheight; y < matrix.height-halfheight; y++) {
					total = 0;
					for (dx = 0; dx < width; dx++) {
						for (dy = 0; dy < height; dy++) {
							total += kernel[dx][dy] * matrix.getCell(x + dx - halfwidth, y + dy - halfheight);
						}
					}
					copy.putCell(x, y, total);
				}
			}
			
			return copy;
		},
		convolvesep: function(matrix, sepkernels) {
			return this.convolve(this.convolve(matrix, sepkernels[1]), sepkernels[0]);
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
	//desat = Carver.gaussian(desat);
	var sobel = Carver.sobel(desat);
	//var sobel = Carver.max(Carver.oldsobel(desat));
	var cumulimportance = Carver.cumulativeImportance(sobel);
	var minimal = Carver.minimalrows(cumulimportance.cumul);
	
	var max = 0;
	for (var i = 0; i < cumulimportance.cumul.data.length; i++) {
		max = Math.max(cumulimportance.cumul.data[i], max);
	}
	
	for (i = 0; i < cumulimportance.cumul.data.length; i++) {
		cumulimportance.cumul.data[i] = cumulimportance.cumul.data[i]/max * 255;
	}
	
	for (var x = 0; x < imageData.width; x++) {
		for (var y = 0; y < imageData.height; y++) {
			imageData.setPixel(x, y, cumulimportance.cumul.getCell(x, y));
		}
	}
	
	var red = {r: 255, g: 0, b: 0, a: 255};
	/*
	var nonoverlap = Carver.nonoverlapping(minimal, cumulimportance.impor, 50);
	for (x = 0; x < nonoverlap.width; x++) {
		for (y = 0; y < nonoverlap.height; y++) {
			if (nonoverlap.getCell(x, y) == 1) {
				imageData.setPixel(x, y, red);
			}
		}
	}
	*/
	
	for (var count = 0; count < 100; count++) {
		var row = minimal[count];
		var x = row[0];
		for (var y = imageData.height-1; y > 0; y--) {
			imageData.setPixel(x, y, red);
			x += cumulimportance.impor.getCell(x, y);
		}
	}
	
	context.putImageData(imageData, 0, 0);
}

img.src = 'tower.png';