// Site Configuration
// UPDATE THIS FILE TO CUSTOMIZE YOUR PORTFOLIO

export const siteConfig = {
  // ===== PERSONAL INFORMATION =====
  name: "Vidhyalaya",
  firstName: "Sara",
  location: "Tirupati, India",
  timezone: "ist",
  tagline: "We architect intelligent systems that think, automate, and scale. This is where ideas become infrastructure.",

  // ===== PROFILE IMAGES =====
  profileImage: "https://customer-assets.emergentagent.com/job_daniel-autry/artifacts/vpfro1p6_WhatsApp%20Image%202026-01-13%20at%2019.29.21.jpeg",
  // Add your closing portrait image here (displayed at the end before footer)
  closingImage: "https://customer-assets.emergentagent.com/job_daniel-autry/artifacts/vpfro1p6_WhatsApp%20Image%202026-01-13%20at%2019.29.21.jpeg",
  architectImage: "/images/lokesh_architect.jpg",

  // ===== CONTACT & SOCIAL LINKS =====
  email: "hello@vidhyalaya.ai",
  phone: "+91 6300272531",
  linkedIn: "https://linkedin.com/company/vidhyalaya-ai",
  github: "https://github.com/Vidhyalaya-Collective",
  portfolio: "https://vidhyalaya.ai",
  blog: "https://blog.vidhyalaya.ai",
  devto: "https://dev.to/vidhyalaya",

  // ===== WORK EXPERIENCES =====
  workExperiences: [
    {
      id: "classrooms",
      company: "Classrooms",
      title: "Real-time Neural Collaboration",
      duration: "Active System 01",
      descriptions: [
        "Architected high-fidelity virtual environments for immersive learning and real-time collaboration.",
        "Integrated live neural synthesis modules that visualize conceptual relationships during active sessions.",
        "Optimized for zero-latency interaction between multiple agents and human learners."
      ]
    },
    {
      id: "courses",
      company: "Courses",
      title: "Dynamic AI-Generated Paths",
      duration: "Active System 02",
      descriptions: [
        "Built a non-linear curriculum engine that adapts learning paths based on real-time mastery metrics.",
        "Utilized Gemini 1.5 Pro to synthesize unstructured data into structured, actionable learning modules.",
        "Implemented optimistic state updates for seamless course navigation and tracking."
      ]
    },
    {
      id: "library",
      company: "Library",
      title: "Scholastic Knowledge Graph",
      duration: "Active System 03",
      descriptions: [
        "Engineered a centralized repository for technical documentation and multi-modal learning assets.",
        "Implemented vector-based search using FAISS for lightning-fast retrieval across high-context documents.",
        "Mapped individual concepts into a global knowledge graph for contextual discovery."
      ]
    },
    {
      id: "exam-mode",
      company: "Exam Mode",
      title: "Adaptive Assessment Engine",
      duration: "Active System 04",
      descriptions: [
        "Developed a distraction-free examination interface with intelligent focus-tracking capabilities.",
        "Created a dynamic question-generation pipeline that probes depth of understanding rather than memorization.",
        "Integrated real-time feedback loops to calibrate mastery levels post-assessment."
      ]
    },
    {
      id: "calendar",
      company: "Calendar",
      title: "Milestone Orchestration",
      duration: "Active System 05",
      descriptions: [
        "Built an intelligent scheduling layer that aligns learning milestones with individual peak-performance windows.",
        "Orchestrated complex dependencies between module completion and future learning objectives.",
        "Automated deadline management to ensure consistent progress toward mastery goals."
      ]
    }
  ],

  // ===== TEAM MEMBERS =====
  team: [
    { name: "Revanth", role: "Lead" },
    { name: "Sania", role: "Systems Architect" },
    { name: "Lokesh", role: "Core Engineer" },
    { name: "Pushpa", role: "Interface Designer" }
  ],

  // ===== ABOUT SECTIONS =====
  aboutSections: [
    {
      title: "Built by a Collective of Minds",
      description: "Vidhyalaya is not the work of one, but the synergy of four. We combined our expertise in backend orchestration, neural synthesis, and academic design to build an engine that actually understands how humans learn."
    },
    {
      title: "Our Mission: Cognitive Clarity",
      description: "We don't just build software; we build clarity. By stripping away the noise of traditional LMS platforms, we've created a space where the depth of understanding is the only metric that matters."
    },
    {
      title: "Vision",
      description: "We envision a world where learning is not a chore, but an autonomous journey of discovery. Vidhyalaya is the first step towards a future where AI doesn't just assist but understands and elevates human potential."
    }
  ],

  // ===== INTERESTS =====
  interests: {
    building: ["Prototypes that become products", "Tools that become standards", "Systems that scale gracefully"],
    reading: ["Systems design papers", "Founder memoirs", "Architecture that inspires"],
    learning: ["Long-form interviews with builders", "Ambient soundscapes for deep work", "AI/ML research breakthroughs"]
  },

  // ===== FOOTER =====
  footer: {
    text: "This site, like everything I build, is crafted, not assembled. Explore the code on",
    linkText: "my GitHub.",
    copyright: "Copyright © 2026 Vidhyalaya. Built with intention, deployed with purpose."
  }
};

export default siteConfig;
