#version 300 es

precision highp float;

out vec4 fragColor;

//uniform vec2 dims;
uniform float minDim;
uniform vec2 viewportx;
uniform vec2 viewporty;
//uniform vec2 center;

#define MAX_ITER 1000.0

// taken from: https://github.com/Erkaman/glsl-cos-palette
// https://iquilezles.org/articles/palettes for more information
vec3 cosPalette(  float t,  vec3 a,  vec3 b,  vec3 c, vec3 d ){
    return a + b*cos( 6.28318*(c*t+d) );
}

void main() {
    // Normalized pixel coordinates (from 0 to 1)
    float x0 = mix(viewportx.x, viewportx.y, gl_FragCoord.x / minDim);
    float y0 = mix(viewporty.x, viewporty.y, gl_FragCoord.y / minDim);
	fragColor = vec4(x0, y0, 0, 1);


    float x2 = 0.0;
    float y2 = 0.0;
    float i = 0.0;
	float x = 0.0;
	float y = 0.0;

	// ripped from wikipedia: https://en.wikipedia.org/wiki/Plotting_algorithms_for_the_Mandelbrot_set#:~:text=The%20simplest%20algorithm%20for%20generating,is%20chosen%20for%20that%20pixel.
    while (x2 + y2 <= 4.0 && i < MAX_ITER) {
		y = 2.0 * x * y + y0;
		x = x2 - y2 + x0;
		x2 = x*x;
		y2= y*y;
        i++;
    }

    // Output to screenP
    //float t = pow(i / MAX_ITER, 0.75);
    float t = i / MAX_ITER;
    vec3 color = cosPalette(t,vec3(0.2,0.5,0.3),vec3(0.0,0.5,0.7),vec3(1.0,1.0,1.0),vec3(0.0,0.3,0.7));
    //vec3 color = vec3(1, 1, 1) * t;
    fragColor = vec4(color, 1);

}