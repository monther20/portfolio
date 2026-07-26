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
