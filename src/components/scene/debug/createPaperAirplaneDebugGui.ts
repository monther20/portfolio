import type { MutableRefObject } from "react";
import type GUI from "lil-gui";

import type { AirplaneFoldAnimationControls } from "../airplane/useAirplaneModeEffects";

export type PaperAirplaneContactFormFieldDebug = {
  placeholder: string;
  marginTop: number;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  borderWidth: number;
  borderRadius: number;
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderOpacity: number;
  textColor: string;
  rows: number;
};

export type PaperAirplaneContactFormDebug = {
  html: {
    x: number;
    y: number;
    z: number;
    distanceFactor: number;
    occlude: boolean;
    zIndexNear: number;
    zIndexFar: number;
  };
  container: {
    width: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    scale: number;
    opacity: number;
    color: string;
  };
  fields: {
    email: PaperAirplaneContactFormFieldDebug;
    subject: PaperAirplaneContactFormFieldDebug;
    message: PaperAirplaneContactFormFieldDebug;
  };
  sendButton: {
    label: string;
    sendingLabel: string;
    width: number;
    marginTop: number;
    fontSize: number;
    fontWeight: number;
    paddingY: number;
    borderWidth: number;
    borderRadius: number;
    backgroundColor: string;
    backgroundOpacity: number;
    borderColor: string;
    textColor: string;
    shadowColor: string;
    shadowX: number;
    shadowY: number;
    shadowBlur: number;
    opacity: number;
    sentOpacity: number;
    sentScale: number;
    hoverRotation: number;
    hoverScale: number;
  };
};

export type PaperAirplaneDebugState = {
  model: {
    visible: boolean;
    x: number;
    y: number;
    z: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scale: number;
  };
  contactForm: PaperAirplaneContactFormDebug;
  animation: {
    foldProgress: number;
  };
};

const FIELD_DEFAULTS: Omit<PaperAirplaneContactFormFieldDebug, "placeholder" | "marginTop" | "rows"> = {
  fontSize: 14,
  paddingX: 9,
  paddingY: 7,
  borderWidth: 1.5,
  borderRadius: 5,
  backgroundColor: "#ffffff",
  backgroundOpacity: 0,
  borderColor: "#111111",
  borderOpacity: 0.72,
  textColor: "#111111",
};

function createFieldDefaults(
  placeholder: string,
  marginTop: number,
  rows = 1,
): PaperAirplaneContactFormFieldDebug {
  return {
    ...FIELD_DEFAULTS,
    placeholder,
    marginTop,
    rows,
  };
}

export function createPaperAirplaneDebugState(): PaperAirplaneDebugState {
  return {
    model: {
      visible: true,
      x: 0,
      y: 0.03,
      z: 0,
      rotationX: 0,
      rotationY: 90,
      rotationZ: 0,
      scale: 0.34,
    },
    contactForm: {
      html: {
        x: 0,
        y: 0,
        z: 0.03,
        distanceFactor: 5.8,
        occlude: true,
        zIndexNear: 10_000,
        zIndexFar: 0,
      },
      container: {
        width: 206,
        paddingTop: 55,
        paddingRight: 18,
        paddingBottom: 20,
        paddingLeft: 18,
        scale: 0.94,
        opacity: 1,
        color: "#111111",
      },
      fields: {
        email: {
          ...createFieldDefaults("email", 0),
          backgroundColor: "#eaeaea",
        },
        subject: createFieldDefaults("subject", 7),
        message: createFieldDefaults("message", 7, 5),
      },
      sendButton: {
        label: "send ✈",
        sendingLabel: "opening mail app…",
        width: 78,
        marginTop: 10,
        fontSize: 18,
        fontWeight: 700,
        paddingY: 6,
        borderWidth: 2,
        borderRadius: 10,
        backgroundColor: "#ffffff",
        backgroundOpacity: 0,
        borderColor: "#111111",
        textColor: "#111111",
        shadowColor: "#111111",
        shadowX: 0,
        shadowY: 0,
        shadowBlur: 0,
        opacity: 1,
        sentOpacity: 0.72,
        sentScale: 0.98,
        hoverRotation: -1,
        hoverScale: 1.03,
      },
    },
    animation: {
      foldProgress: 1,
    },
  };
}

type CreatePaperAirplaneDebugGuiOptions = {
  state: PaperAirplaneDebugState;
  foldAnimationRef: MutableRefObject<AirplaneFoldAnimationControls | null>;
  onChange: () => void;
};

function round(value: number) {
  return Number(value.toFixed(4));
}

function serializeField(field: PaperAirplaneContactFormFieldDebug) {
  return {
    placeholder: field.placeholder,
    marginTop: round(field.marginTop),
    fontSize: round(field.fontSize),
    padding: {
      x: round(field.paddingX),
      y: round(field.paddingY),
    },
    border: {
      width: round(field.borderWidth),
      radius: round(field.borderRadius),
      color: field.borderColor,
      opacity: round(field.borderOpacity),
    },
    background: {
      color: field.backgroundColor,
      opacity: round(field.backgroundOpacity),
    },
    textColor: field.textColor,
    rows: round(field.rows),
  };
}

function serializeMeshes(state: PaperAirplaneDebugState) {
  return {
    paperAirplaneModel: {
      visible: state.model.visible,
      position: {
        x: round(state.model.x),
        y: round(state.model.y),
        z: round(state.model.z),
      },
      rotationDegrees: {
        x: round(state.model.rotationX),
        y: round(state.model.rotationY),
        z: round(state.model.rotationZ),
      },
      scale: round(state.model.scale),
    },
  };
}

function serializeContactForm(state: PaperAirplaneDebugState) {
  return {
    html: {
      position: {
        x: round(state.contactForm.html.x),
        y: round(state.contactForm.html.y),
        z: round(state.contactForm.html.z),
      },
      distanceFactor: round(state.contactForm.html.distanceFactor),
      occlude: state.contactForm.html.occlude,
      zIndexRange: [
        round(state.contactForm.html.zIndexNear),
        round(state.contactForm.html.zIndexFar),
      ],
    },
    container: {
      width: round(state.contactForm.container.width),
      padding: {
        top: round(state.contactForm.container.paddingTop),
        right: round(state.contactForm.container.paddingRight),
        bottom: round(state.contactForm.container.paddingBottom),
        left: round(state.contactForm.container.paddingLeft),
      },
      scale: round(state.contactForm.container.scale),
      opacity: round(state.contactForm.container.opacity),
      color: state.contactForm.container.color,
    },
    fields: {
      email: serializeField(state.contactForm.fields.email),
      subject: serializeField(state.contactForm.fields.subject),
      message: serializeField(state.contactForm.fields.message),
    },
    sendButton: {
      ...state.contactForm.sendButton,
      width: round(state.contactForm.sendButton.width),
      marginTop: round(state.contactForm.sendButton.marginTop),
      fontSize: round(state.contactForm.sendButton.fontSize),
      fontWeight: round(state.contactForm.sendButton.fontWeight),
      paddingY: round(state.contactForm.sendButton.paddingY),
      borderWidth: round(state.contactForm.sendButton.borderWidth),
      borderRadius: round(state.contactForm.sendButton.borderRadius),
      backgroundOpacity: round(state.contactForm.sendButton.backgroundOpacity),
      shadowX: round(state.contactForm.sendButton.shadowX),
      shadowY: round(state.contactForm.sendButton.shadowY),
      shadowBlur: round(state.contactForm.sendButton.shadowBlur),
      opacity: round(state.contactForm.sendButton.opacity),
      sentOpacity: round(state.contactForm.sendButton.sentOpacity),
      sentScale: round(state.contactForm.sendButton.sentScale),
      hoverRotation: round(state.contactForm.sendButton.hoverRotation),
      hoverScale: round(state.contactForm.sendButton.hoverScale),
    },
  };
}

function serializeAnimation(state: PaperAirplaneDebugState) {
  return {
    fold: {
      progress: round(state.animation.foldProgress),
    },
  };
}

function serializeDebugState(state: PaperAirplaneDebugState) {
  return {
    meshes: serializeMeshes(state),
    contactForm: serializeContactForm(state),
    animation: serializeAnimation(state),
  };
}

async function copyJsonToClipboard(label: string, value: unknown) {
  const text = JSON.stringify(value, null, 2);

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      console.info(`${label} copied to clipboard`, value);
      return;
    }

    console.warn("Clipboard API is unavailable. JSON value:", text);
  } catch (error) {
    console.error(`Failed to copy ${label}`, error, text);
  }
}

function addFieldControls(
  folder: GUI,
  label: string,
  field: PaperAirplaneContactFormFieldDebug,
  onChange: () => void,
  includeRows = false,
) {
  const fieldFolder = folder.addFolder(label);

  fieldFolder.add(field, "placeholder").name("placeholder").onChange(onChange);
  fieldFolder.add(field, "marginTop", 0, 40, 1).name("margin top").onChange(onChange);
  fieldFolder.add(field, "fontSize", 8, 28, 1).name("font size").onChange(onChange);
  fieldFolder.add(field, "paddingX", 0, 28, 1).name("padding x").onChange(onChange);
  fieldFolder.add(field, "paddingY", 0, 28, 1).name("padding y").onChange(onChange);
  fieldFolder.add(field, "borderWidth", 0, 6, 0.1).name("border width").onChange(onChange);
  fieldFolder.add(field, "borderRadius", 0, 24, 1).name("border radius").onChange(onChange);
  fieldFolder.addColor(field, "backgroundColor").name("background").onChange(onChange);
  fieldFolder.add(field, "backgroundOpacity", 0, 1, 0.01).name("background opacity").onChange(onChange);
  fieldFolder.addColor(field, "borderColor").name("border color").onChange(onChange);
  fieldFolder.add(field, "borderOpacity", 0, 1, 0.01).name("border opacity").onChange(onChange);
  fieldFolder.addColor(field, "textColor").name("text color").onChange(onChange);

  if (includeRows) {
    fieldFolder.add(field, "rows", 2, 10, 1).name("rows").onChange(onChange);
  }

  return fieldFolder;
}

export async function createPaperAirplaneDebugGui({
  state,
  foldAnimationRef,
  onChange,
}: CreatePaperAirplaneDebugGuiOptions): Promise<GUI> {
  const { default: GUI } = await import("lil-gui");
  const gui = new GUI({ title: "Paper Airplane Debug" });

  const handleChange = () => {
    foldAnimationRef.current?.setProgress(state.animation.foldProgress);
    onChange();
  };

  const copyActions = {
    async copyAllValues() {
      await copyJsonToClipboard("All Values", serializeDebugState(state));
    },
  };

  gui.add(copyActions, "copyAllValues").name("Copy All Values");

  const meshesFolder = gui.addFolder("Meshes");
  const meshCopyActions = {
    async copyMeshesValues() {
      await copyJsonToClipboard("Meshes Values", serializeMeshes(state));
    },
  };
  meshesFolder.add(meshCopyActions, "copyMeshesValues").name("Copy Meshes Values");

  const modelFolder = meshesFolder.addFolder("Paper Airplane Model");
  modelFolder.add(state.model, "visible").name("visible").onChange(handleChange);

  const positionFolder = modelFolder.addFolder("position");
  positionFolder.add(state.model, "x", -2, 2, 0.01).name("x").onChange(handleChange);
  positionFolder.add(state.model, "y", -2, 2, 0.01).name("y").onChange(handleChange);
  positionFolder.add(state.model, "z", -2, 2, 0.01).name("z").onChange(handleChange);

  const rotationFolder = modelFolder.addFolder("rotation °");
  rotationFolder.add(state.model, "rotationX", -180, 180, 0.1).name("x").onChange(handleChange);
  rotationFolder.add(state.model, "rotationY", -180, 180, 0.1).name("y").onChange(handleChange);
  rotationFolder.add(state.model, "rotationZ", -180, 180, 0.1).name("z").onChange(handleChange);

  modelFolder.add(state.model, "scale", 0.05, 1, 0.01).name("scale").onChange(handleChange);

  const contactFolder = gui.addFolder("Contact Form");
  const contactCopyActions = {
    async copyContactFormValues() {
      await copyJsonToClipboard("Contact Form Values", serializeContactForm(state));
    },
  };
  contactFolder.add(contactCopyActions, "copyContactFormValues").name("Copy Contact Form Values");

  const htmlFolder = contactFolder.addFolder("HTML Overlay");
  const htmlPositionFolder = htmlFolder.addFolder("position");
  htmlPositionFolder.add(state.contactForm.html, "x", -2, 2, 0.01).name("x").onChange(handleChange);
  htmlPositionFolder.add(state.contactForm.html, "y", -2, 2, 0.01).name("y").onChange(handleChange);
  htmlPositionFolder.add(state.contactForm.html, "z", -1, 1, 0.01).name("z").onChange(handleChange);
  htmlFolder.add(state.contactForm.html, "distanceFactor", 1, 20, 0.1).name("distance factor").onChange(handleChange);
  htmlFolder.add(state.contactForm.html, "occlude").name("occlude").onChange(handleChange);
  htmlFolder.add(state.contactForm.html, "zIndexNear", 0, 20_000, 1).name("z-index near").onChange(handleChange);
  htmlFolder.add(state.contactForm.html, "zIndexFar", 0, 20_000, 1).name("z-index far").onChange(handleChange);

  const containerFolder = contactFolder.addFolder("Form Container");
  containerFolder.add(state.contactForm.container, "width", 120, 520, 1).name("width").onChange(handleChange);
  containerFolder.add(state.contactForm.container, "paddingTop", 0, 60, 1).name("padding top").onChange(handleChange);
  containerFolder.add(state.contactForm.container, "paddingRight", 0, 60, 1).name("padding right").onChange(handleChange);
  containerFolder.add(state.contactForm.container, "paddingBottom", 0, 60, 1).name("padding bottom").onChange(handleChange);
  containerFolder.add(state.contactForm.container, "paddingLeft", 0, 60, 1).name("padding left").onChange(handleChange);
  containerFolder.add(state.contactForm.container, "scale", 0.2, 2, 0.01).name("scale").onChange(handleChange);
  containerFolder.add(state.contactForm.container, "opacity", 0, 1, 0.01).name("opacity").onChange(handleChange);
  containerFolder.addColor(state.contactForm.container, "color").name("text color").onChange(handleChange);

  const fieldsFolder = contactFolder.addFolder("Fields");
  addFieldControls(fieldsFolder, "Email Field", state.contactForm.fields.email, handleChange);
  addFieldControls(fieldsFolder, "Subject Field", state.contactForm.fields.subject, handleChange);
  addFieldControls(fieldsFolder, "Message Field", state.contactForm.fields.message, handleChange, true);

  const sendFolder = contactFolder.addFolder("Send Button");
  sendFolder.add(state.contactForm.sendButton, "label").name("label").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "sendingLabel").name("sending label").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "width", 32, 220, 1).name("width").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "marginTop", 0, 40, 1).name("margin top").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "fontSize", 8, 36, 1).name("font size").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "fontWeight", 100, 900, 1).name("font weight").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "paddingY", 0, 24, 1).name("padding y").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "borderWidth", 0, 8, 0.1).name("border width").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "borderRadius", 0, 30, 1).name("border radius").onChange(handleChange);
  sendFolder.addColor(state.contactForm.sendButton, "backgroundColor").name("background").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "backgroundOpacity", 0, 1, 0.01).name("background opacity").onChange(handleChange);
  sendFolder.addColor(state.contactForm.sendButton, "borderColor").name("border color").onChange(handleChange);
  sendFolder.addColor(state.contactForm.sendButton, "textColor").name("text color").onChange(handleChange);
  sendFolder.addColor(state.contactForm.sendButton, "shadowColor").name("shadow color").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "shadowX", -12, 12, 1).name("shadow x").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "shadowY", -12, 12, 1).name("shadow y").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "shadowBlur", 0, 20, 1).name("shadow blur").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "opacity", 0, 1, 0.01).name("opacity").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "sentOpacity", 0, 1, 0.01).name("sent opacity").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "sentScale", 0.5, 1.2, 0.01).name("sent scale").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "hoverRotation", -20, 20, 0.1).name("hover rotation").onChange(handleChange);
  sendFolder.add(state.contactForm.sendButton, "hoverScale", 0.5, 1.5, 0.01).name("hover scale").onChange(handleChange);

  const animationFolder = gui.addFolder("Animation");
  const animationCopyActions = {
    async copyAnimationValues() {
      await copyJsonToClipboard("Animation Values", serializeAnimation(state));
    },
  };
  animationFolder.add(animationCopyActions, "copyAnimationValues").name("Copy Animation Values");

  const foldFolder = animationFolder.addFolder("Fold Animation");
  foldFolder
    .add(state.animation, "foldProgress", 0, 1, 0.01)
    .name("fold progress")
    .onChange(handleChange);

  return gui;
}
