export interface AboutData {
  name: string;
  title: string;
  description: string;
  currentRole: string;
  studyYear: string;
  company: string;
}

export interface ContactData {
  email: string;
  phone: string;
}

export const aboutData: AboutData = {
  name: "Monther Aloufi",
  title: "frontend developer",
  description: "I'm Monther Aloufi, a frontend developer passionate about creating seamless web and mobile experiences with React and React Native. Currently in my 4th year of studies, I've progressed from freelancing to working as a graduate trainee at Alphaworks, where I tackle real-world challenges and deliver client solutions. I'm expanding my skill set into backend development and UI/UX design, working toward becoming a versatile full-stack developer who can bring ideas to life from concept to deployment",
  currentRole: "graduate trainee",
  studyYear: "4th year",
  company: "Alphaworks"
};

export const contactData: ContactData = {
  email: "monther.aloufi20@gmail.com",
  phone: "+962 780672010"
};