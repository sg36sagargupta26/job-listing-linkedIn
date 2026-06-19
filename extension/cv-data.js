// Sagar Gupta — CV Data (extracted from sg36sagargupta26.github.io)
const CV_DATA = {
  name: "Sagar Gupta",
  title: "Backend Engineer",
  summary: `Backend Engineer with 6+ years of experience designing and building secure, scalable, high-availability backend systems using Java, Spring Boot, REST APIs, Microservices, and AWS.
Experienced in authentication platforms, cloud migration, CI/CD modernization, and system modernization within regulated banking environments. Currently at Barclays, driving critical backend initiatives with measurable business impact.
Graduate of IIT Kharagpur, passionate about clean architecture, developer productivity, and solving complex distributed systems problems.`,

  experience: [
    {
      role: "Backend Engineer",
      company: "Barclays",
      location: "Pune, India",
      duration: "Jul 2019 — Present",
      highlights: [
        "Delivered app-based 2FA for Barclays Online Banking, replacing legacy PINsentry hardware. Improved authentication speed and user experience via push-based real-time approvals, delivering ~£6M savings over 5 years.",
        "Led CI/CD modernization by migrating build and deployment pipelines from Jenkins to GitLab CI, introducing automated quality, security, and compliance gates that improved release stability and developer productivity.",
        "Led modernization of legacy Java and Spring Boot services, improving application performance by 50% (3s→1.5s) while maintaining backward compatibility and supporting scalable microservices adoption.",
        "Implemented mutation testing using PIT (Java) and Stryker (React), strengthening test effectiveness and improving defect detection across backend and frontend applications.",
        "Created a separate journey to support accessibility and vulnerability requirements, enabling customers to receive bank statements in Braille, large print, and audio formats.",
        "Implemented a 'Go Paperless' interstitial page prompting customers to switch to digital delivery, reducing paper costs by ~£200K/year.",
        "Led cloud migration of authentication microservices to AWS, implementing cloud-native stateless services that improved scalability, high availability, and deployment reliability.",
        "Enabled reuse of an existing React application by exposing stable, backward-compatible backend APIs and integrating them into a mobile WebView flow."
      ]
    },
    {
      role: "Mobile Developer Intern",
      company: "TCG Digital",
      location: "Kolkata, India",
      duration: "Mar 2018 — May 2018",
      highlights: [
        "Developed a mobile application using React Native to visualize import-export data across major Indian ports."
      ]
    }
  ],

  education: "IIT Kharagpur",

  skills: {
    languages: ["Java 8", "Java 17", "JavaScript", "Python"],
    frameworks: ["Spring", "Spring Boot", "REST APIs", "React", "React Native"],
    architecture: ["Microservices", "Cloud Native", "Auth Systems", "High Availability"],
    databases: ["MySQL", "Redis"],
    cloud_devops: ["AWS", "CI/CD", "Git", "GitLab CI", "Jenkins", "Docker"],
    practices: ["System Modernization", "Cloud Migration", "Mutation Testing"]
  },

  allSkillsFlat: [
    "Java", "Java 8", "Java 17", "JavaScript", "Python",
    "Spring", "Spring Boot", "REST APIs", "React", "React Native",
    "Microservices", "Cloud Native", "Auth Systems", "High Availability",
    "MySQL", "Redis",
    "AWS", "CI/CD", "Git", "GitLab CI", "Jenkins", "Docker",
    "System Modernization", "Cloud Migration", "Mutation Testing"
  ]
};
