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
    vec3 adjustedPos = pos - plane.position;
    float distance = dot(adjustedPos, plane.normal);
    return distance;
}

float sphereSDF(vec3 pos, Sphere sphere){
    vec3 newPos;
    newPos = pos;
    // float k = sphere.pos.x - sphere.radius;
    bool reflectivePlanes = false;
    if (reflectivePlanes == true){
        float k2 = 1.;
        float k3 = 2.;
        float x = pos.x;
        x = abs(pos.x);
        x = abs(x-k2)+k2;
        x = abs(x-k3)+k3;

        newPos = vec3(x, pos.yz);
    }

    // newPos = vec3(abs(pos.x-k)+k,pos.yz);
    // newPos = vec3(abs(newPos.x), newPos.yz); //middle refective plane
    // return length(mod(pos,4.) - sphere.pos) - sphere.radius;  //for infinite renders

    // newPos = vec3(pos.x + 3., pos.yz);
    // newPos = vec3(newPos.xy, newPos.z - 2.);
  
    return length(sphere.pos - newPos) - sphere.radius;
}

/*returns the nearest SDF from any possible object
*/
vec3 translate(vec3 p, vec3 shift){
    return p - shift;
}

vec3 translateX(vec3 p, float x){
    return vec3(p.x - x, p.yz);
}

vec3 translateY(vec3 p, float y){
    return vec3(p.x,p.y - y, p.z);
}

vec3 translateZ(vec3 p, float z){
    return vec3(p.xy, p.z - z);
}


vec3 reflectedSphereSDF(vec3 pos, vec3 N, vec3 planePos, Sphere sphere){
    N = normalize(N);
    vec3 diff = (pos-planePos);
    vec3 newPos = diff;

    float dist = sign(dot(diff,N));
    float dir = sign(dot(sphere.pos - planePos , N));

    if (-dir == dist){
        newPos += -2. * (N * dot(diff,N));
    }
    
    // vec3 dist = N * dot(diff,N);
    // newPos = diff - (2. * (N * dot(diff,N)));
    // vec3 newPos = diff - max(2. * (N * dot(diff,N)),-2.);

    return planePos + (newPos);

}

vec3 translatedSphereSDF(vec3 pos, vec3 translation, Sphere sphere){
    if ((sphereSDF(pos,sphere))<sphereSDF(translate(pos,translation),sphere)){
        return pos;
    }
    else return translate(pos,translation);
}


float objectSDF(vec3 pos, Plane plane, Sphere sphere){
    float planeDist = planeSDF(pos,plane);
    float sphereDist = sphereSDF(pos,sphere);

    // pos = translateY(pos,-1.5);
    // sphereDist = reflectedSphereSDF(translatedSphereSDF(pos,vec3(2,0,0),sphere), vec3(1,0, 0), vec3(0,0,0),sphere);
    // pos = reflectedSphereSDF(pos, vec3(1,0, 0), vec3(0,1,0),sphere);
    pos = translatedSphereSDF(pos,vec3(1,0,0),sphere);
    pos = translatedSphereSDF(pos,vec3(0,-1,0),sphere);
    pos = translatedSphereSDF(pos,vec3(0,0,1),sphere);
    // pos = translatedSphereSDF(pos,vec3(1.,0,0),sphere);

    // pos = reflectedSphereSDF(pos,vec3(0,-1,0),vec3(0,1,0),sphere);
    sphereDist = sphereSDF(pos,sphere);

    // return sphereDist;
    return min(planeDist , sphereDist);
}

vec3 calculateNormal(vec3 pos, Plane plane, Sphere sphere){
    float epsilon = 0.001;
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
    // vec3 ro = vec3(0. + 0.5 * u_time,0. + u_time,-imgDist + u_time);
    vec3 ro = vec3(0.,0.,-imgDist);
    vec3 rd = vec3(uv.xy, imgDist);
    vec3 skyColor = vec3(0.5725, 0.8588, 1.0);
    rd = normalize(rd);
    
    Light light = Light(vec3(0. , 5.0  , 6.), 2.0);
    Sphere sphere = Sphere(
        // vec3(2. ,2., 2.),
        vec3(sin(u_time),2., 2.),
        .5,
        vec3(0.1216, 0.1216, 0.8353),
        .3
    );
    Plane plane = Plane(
        vec3(0.,-3,.0),
        normalize(vec3(0.,1,0)),
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
        if (step < 0.0001){
            vec3 surfaceNormal = calculateNormal(pos,plane,sphere);
            vec3 viewReflection = reflect(rd,surfaceNormal);            
            vec3 lightReflection = reflectLight(light,pos,surfaceNormal);

            vec3 ambient = vec3(0.2);

            vec3 diffuse;
            // diffuse += vec3(max(dot(surfaceNormal, normalize(light.pos-pos)),0.));
            diffuse += vec3(max(dot(surfaceNormal,vec3(0,1,0)), 0.));//global diffuse from above
            vec3 specular = vec3(max(0.,sphere.gloss * dot(viewReflection, lightReflection)));
            
            vec3 lighting = ambient + diffuse + specular;

            vec3 shadow = softShadow(pos,light,plane,sphere);
            lighting += shadow;
            
            float sphereDist = sphereSDF(pos,sphere);
            float planeDist = planeSDF(pos,plane);

            float fogRate = .005;
            if (sphereDist < planeDist){
                // return surfaceNormal;
                // return vec3(pos/20.);
                return lerp(sphere.color * lighting, skyColor, (length(pos-ro)-5.) * fogRate);
            }
            else if(planeDist < sphereDist){
                return lerp(plane.color * lighting, skyColor, (length(pos-ro)-5.) * fogRate);
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

