"""Optional Blender importer for the editable quad source, with packed texture.
Run from Blender's Scripting workspace, or:
blender --background --python source/create_blender_scene.py
This helper requires Blender; the GLB and OBJ can also be imported directly.
"""
from pathlib import Path
import json, math
import bpy

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'source/mesh-source.json').read_text())
# Create a dedicated collection without deleting any existing work.
collection = bpy.data.collections.new('FantasyDoor_Source')
bpy.context.scene.collection.children.link(collection)
mesh = bpy.data.meshes.new('Door_EditableQuads')
# glTF Y-up -> Blender Z-up. Door front becomes -Y; hinge is Blender Z.
mesh.from_pydata([(x, -z, y) for x, y, z in data['vertices']], [], data['faces'])
mesh.update()
obj = bpy.data.objects.new('DoorHinge', mesh)
collection.objects.link(obj)
uv = mesh.uv_layers.new(name='ReferenceAtlas')
for poly, coords in zip(mesh.polygons, data['face_uvs']):
    for li, (u, v) in zip(poly.loop_indices, coords):
        uv.data[li].uv = (u, 1-v)
for name in sorted(set(data['face_groups'])):
    vg = obj.vertex_groups.new(name=name)
    indices = sorted({i for face, group in zip(data['faces'],data['face_groups']) if group == name for i in face})
    vg.add(indices, 1.0, 'REPLACE')
material = bpy.data.materials.new('Reference_ColoredPencil_Unlit')
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
emission = nodes.new('ShaderNodeEmission')
texture = nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(ROOT / 'textures/door-pencil-atlas.png'), check_existing=True)
texture.image.pack()
material.node_tree.links.new(texture.outputs['Color'], emission.inputs['Color'])
material.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
mesh.materials.append(material)
obj['units'] = 'metres'
obj['hinge_axis'] = 'Z (Blender); Y in glTF'
obj['front'] = '-Y (Blender); +Z in glTF'
obj['leaf_dimensions_metres'] = [1.04, 2.05, .13]
# Store both separate actions; the existing GLB includes the validated web clips.
for name, reverse in [('Door_Open', False), ('Door_Close', True)]:
    obj.animation_data_create()
    obj.animation_data.action = None
    for i in range(25):
        t = i/24
        t = t*t*(3-2*t)
        obj.rotation_euler.z = math.pi/2 * (1-t if reverse else t)
        obj.keyframe_insert(data_path='rotation_euler', index=2, frame=1+i*1.5)
    action = obj.animation_data.action
    action.name = name
    action.use_fake_user = True
obj.animation_data.action = None
obj.rotation_euler = (0, 0, 0)
bpy.context.scene.render.fps = 30
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 37
bpy.context.scene.view_settings.view_transform = 'Standard'
for item in bpy.context.selected_objects:
    item.select_set(False)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.type = 'MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'fantasy-door.blend'))
print('Saved', ROOT / 'fantasy-door.blend')
