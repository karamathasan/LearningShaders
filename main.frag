// fragment.shader
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
const float imgDist = 1.;

struct Sphere{
    vec3 pos;
    float radius;
    vec3 color;
};

struct Light{
    vec3 pos;
    float intensity;
};

struct Plane{
    vec3 position;
    vec3 axis1;
    vec3 axis2;
    vec3 color;
};



float planeSDF(vec3 pos, Plane plane){
    return pos.y - plane.position.y;
}

float sphereSDF(vec3 pos, Sphere sphere){
    return length(sphere.pos - pos) - sphere.radius;
}

/*returns the nearest SDF from any possible object
*/
float objectSDF(vec3 pos, Plane plane, Sphere sphere){
    return min(planeSDF(pos,plane) , sphereSDF(pos,sphere));
}

vec3 calculateNormal(vec3 pos, Plane plane, Sphere sphere){
    float epsilon = 0.01;
    vec3 vector1 = vec3(
        objectSDF(pos + vec3(epsilon,0,0),plane,sphere),
        objectSDF(pos + vec3(0,epsilon,0),plane,sphere),
        objectSDF(pos + vec3(0,0,epsilon),plane,sphere)
    );
    vec3 vector2 = vec3(
        objectSDF(pos - vec3(epsilon,0,0),plane,sphere),
        objectSDF(pos - vec3(0, epsilon,0),plane,sphere),
        objectSDF(pos - vec3(0,0,epsilon),plane,sphere)
    );
    return vector1-vector2;
}

vec3 render(vec2 uv){
    vec3 ro = vec3(0,0,-imgDist);
    vec3 rd = vec3(uv.xy, imgDist);
    normalize(rd);
    
    Light light = Light(vec3(0,2,6) , 40.0);
    Sphere sphere = Sphere(
        vec3(0. + cos(u_time),0, 6. + sin(u_time))
        ,2.0,
        vec3(0.0, 0.1, 1.0)
    );
    Plane plane = Plane(
        vec3(0,-10.0,0),
        vec3(1,0,0),
        vec3(0,0,1),
        vec3(0.4)
    );

    const int iterationLimit = 250;
    vec3 pos = ro;

    // float step = sphereSDF(pos, sphere);
    // float step = objectSDF(pos, plane, sphere);
    // for (int i = 0; i < iterationLimit; i ++){
    //     pos += rd * step;
    //     // step = sphereSDF(pos, sphere);
    //     step = objectSDF(pos,plane,sphere);
    //     if (step < 0.01){
            // // float dist = length(pos - ro);
            // // float percentage =  1. - (dist - sphereSDF(ro,sphere)) / sphereSDF(ro,sphere);
            // vec3 surfaceNormal = calculateNormal(pos,plane,sphere);
            // vec3 reflection = reflect(rd,surfaceNormal);
            // vec3 lightReflection = light.intensity * reflect(normalize( light.pos - pos),surfaceNormal);
            // return sphere.color * .3 * dot(reflection, lightReflection);
    //     }
    // }

    float step = planeSDF(pos, plane);
    for (int i = 0; i < iterationLimit; i ++){
        pos += rd * step;
        step = planeSDF(pos, plane);
        if (step < 0.01){
            float dist = length(pos - ro);
            vec3 surfaceNormal = calculateNormal(pos,plane,sphere);
            vec3 reflection = reflect(rd,surfaceNormal);
            vec3 lightReflection = 1. * light.intensity * reflect(normalize(light.pos - pos),surfaceNormal);
            return plane.color * dot(reflection, lightReflection);;
            // return plane.color - 0.02 * sqrt(dist);
        }
    }

    return vec3(1);

    // return vec3(uv.xy,0);
}

void main(){ 
    vec2 uv = vec2(2.0 * gl_FragCoord.xy / u_resolution - 1.);

    
    vec3 color = render(uv);
    gl_FragColor = vec4(color,1.);


}

