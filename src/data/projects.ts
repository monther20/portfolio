export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    id: "1",
    title: "E-Commerce Platform",
    description: "A full-stack e-commerce solution built with React and Node.js. Features include user authentication, shopping cart, payment integration, and admin dashboard.",
    techStack: ["React", "Node.js", "MongoDB", "Stripe", "Tailwind"],
    githubUrl: "https://github.com/monther/ecommerce-platform",
    liveUrl: "https://ecommerce-demo.com",
    imageUrl: "/projects/project-1.svg",
    featured: true
  },
  {
    id: "2", 
    title: "Task Management App",
    description: "A collaborative task management application with real-time updates, drag-and-drop functionality, and team collaboration features.",
    techStack: ["React", "Socket.io", "Express", "PostgreSQL"],
    githubUrl: "https://github.com/monther/task-manager",
    liveUrl: "https://taskmanager-demo.com",
    imageUrl: "/projects/project-2.svg"
  },
  {
    id: "3",
    title: "Weather Dashboard",
    description: "Interactive weather dashboard with beautiful visualizations, location search, and weather forecasts using modern APIs.",
    techStack: ["React", "Chart.js", "OpenWeather API", "GSAP"],
    githubUrl: "https://github.com/monther/weather-dashboard",
    liveUrl: "https://weather-dashboard-demo.com",
    imageUrl: "/projects/project-3.svg"
  },
  {
    id: "4",
    title: "Mobile Game Portfolio",
    description: "A collection of mobile games built with React Native, featuring physics simulations and smooth animations.",
    techStack: ["React Native", "PhyJS", "Framer Motion"],
    githubUrl: "https://github.com/monther/mobile-games",
    imageUrl: "/projects/project-4.svg"
  },
  {
    id: "5",
    title: "Portfolio Website",
    description: "A creative portfolio website showcasing hand-drawn aesthetics with RoughJS and interactive animations.",
    techStack: ["NextJS", "RoughJS", "GSAP", "Tailwind"],
    githubUrl: "https://github.com/monther/portfolio",
    imageUrl: "/projects/project-5.svg",
    featured: true
  },
  {
    id: "6",
    title: "Chat Application",
    description: "Real-time chat application with private messaging, group chats, and file sharing capabilities.",
    techStack: ["React", "Socket.io", "Firebase", "Material-UI"],
    githubUrl: "https://github.com/monther/chat-app",
    liveUrl: "https://chat-app-demo.com",
    imageUrl: "/projects/project-6.svg"
  },
  {
    id: "7",
    title: "Learning Management System",
    description: "Educational platform with course management, student progress tracking, and interactive learning modules.",
    techStack: ["React", "Node.js", "MySQL", "AWS"],
    githubUrl: "https://github.com/monther/lms-platform",
    imageUrl: "/projects/project-7.svg"
  },
  {
    id: "8",
    title: "Recipe Sharing App",
    description: "Social recipe sharing platform where users can discover, share, and rate cooking recipes from around the world.",
    techStack: ["React Native", "Firebase", "Redux"],
    githubUrl: "https://github.com/monther/recipe-app",
    imageUrl: "/projects/project-8.svg"
  }
];