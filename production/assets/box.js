import {block} from '../../avatar/baseAvatar.js';
export function box(parent,name,size,color,position,radius=.03){
 const mesh=block(name,size,color,radius);mesh.position.set(...position);parent.add(mesh);return mesh;
}
