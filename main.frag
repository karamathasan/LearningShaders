// fragment.shader
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
const float imgDist = 1.;

//dimensions are in width, length, depth to resemble xyz
struct Rect{
    vec3 dimensions;
    vec3 position;
    vec3 orientation;// facing right by default, (1,0,0)
    vec3 color;
    vec3 gloss;
};

float RectSDF(vec3 pos, Rect rect){
    float centerDist = length(rect.position - pos);
    // float rectOverlap = orientation
    return centerDist;
}

struct Sphere{
    vec3 pos;
    float radius;
    vec3 color;
    float gloss;
};

struct Light{
    vec3 pos;
    float intensity;
};

struct Plane{
    vec3 position;
    vec3 normal;
    vec3 color;
};

float planeSDF(vec3 pos, Plane plane){
    // return plane.position.y - pos.y;
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
    float epsilon = 0.0001;
    float centerDistance = objectSDF(pos, plane, sphere);
    float xDistance = objectSDF((pos + vec3(epsilon, 0, 0)), plane, sphere);
    float yDistance = objectSDF((pos + vec3(0, epsilon, 0)), plane, sphere);
    float zDistance = objectSDF((pos + vec3(0, 0, epsilon)), plane, sphere);
    return (vec3(xDistance,yDistance,zDistance) - centerDistance)/epsilon;
}

float inverseSquare(float value){
    return 1./(value*value);
}

vec3 reflectLight(Light light, vec3 pos ,vec3 normal){
    vec3 incomingLight = light.pos-pos;
    vec3 reflectedLight = reflect(normalize(incomingLight), normal);
    normalize(reflectedLight);
    reflectedLight *= (light.intensity * inverseSquare(length(incomingLight)));
    return reflectedLight;
}

vec3 lerp(vec3 a, vec3 b, float t){
    t = clamp(t,0.,1.);
    vec3 diff = b-a;
    return diff * t + a;
}

vec3 softShadow(vec3 pos, Light light, Plane plane, Sphere sphere){
    vec3 initPos = pos;
    vec3 rd = normalize(light.pos - pos);//may need to be inverted
    float minDist;
    float step ;
    for (int i = 0; i < 150; i++){
        pos += rd*step;
        minDist = (step,objectSDF(pos,plane,sphere));
        step = objectSDF(pos,plane,sphere);
        if (pos-initPos == light.pos-pos){
            break;
        }
        if(step < 0.001){
            return vec3(-0.1);
        }
    }
}

vec3 render(vec2 uv){
    vec3 ro = vec3(0,0,-imgDist);
    vec3 rd = vec3(uv.xy, imgDist);
    vec3 skyColor = vec3(0.5725, 0.8588, 1.0);
    normalize(rd);
    
    Light light = Light(vec3(0. , 5.0  , 6.), 2.0);
    Sphere sphere = Sphere(
        vec3(0. + sin(2. * u_time),0, 6. + cos(2. * u_time))
        ,2.0,
        vec3(0.1216, 0.1216, 0.8353),
        .3
    );
    Plane plane = Plane(
        vec3(0,-3.0,0),
        vec3(0,1,0),
        vec3(0.1451, 0.1451, 0.1451)
    );


    const int iterationLimit = 300;
    vec3 pos = ro;

    float step = objectSDF(pos, plane, sphere);
    for (int i = 0; i < iterationLimit; i ++){
        pos += rd * step;
        step = objectSDF(pos,plane,sphere);
        if (step > 100.){
            break;
        }
        if (step < 0.01){
            vec3 surfaceNormal = calculateNormal(pos,plane,sphere);
            vec3 viewReflection = reflect(rd,surfaceNormal);            
            vec3 lightReflection = reflectLight(light,pos,surfaceNormal);

            vec3 ambient = vec3(0.2);

            vec3 diffuse;
            diffuse += vec3(max(dot(surfaceNormal, normalize(light.pos-pos)),0.));
            diffuse += vec3(max(dot(surfaceNormal,vec3(0,1,0)), 0.));//global diffuse from above
            vec3 specular = vec3(max(0.,sphere.gloss * dot(viewReflection, lightReflection)));
            
            vec3 lighting = ambient + diffuse + specular;

            vec3 shadow = softShadow(pos,light,plane,sphere);
            lighting += shadow;
            
            float sphereDist = sphereSDF(pos,sphere);
            float planeDist = planeSDF(pos,plane);

            if (sphereDist < planeDist){
                return  (sphere.color) * lighting;
            }
            else if(planeDist < sphereDist){
                float fogRate = .0075;
                return lerp(plane.color * lighting, skyColor, (length(pos)-5.) * fogRate);
            }
        }
    }

    return skyColor;
}

void main(){ 
    vec2 uv = vec2(2.0 * gl_FragCoord.xy / u_resolution - 1.);    
    vec3 color = render(uv);
    gl_FragColor = vec4(color,1.);
}

