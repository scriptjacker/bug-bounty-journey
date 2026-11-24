// The CV as data. Both versions come from here, so the public CV on the site and the longer
// one with client engagements can never drift apart. Counts that the site can prove are read
// from data/; the two headline figures (450+ and 250+) are set by hand on purpose and match
// the homepage.
//
// Style rules, kept on purpose:
//   - Every bullet opens with a verb and, where there is one, carries a number.
//   - Acronyms appear next to their full form once, so a recruiter searching either finds it.
//   - No dashes in prose. Date ranges read "Nov 2023 to Present".
//   - Nothing goes in that the portfolio or an email cannot back up.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const json = (f) => JSON.parse(readFileSync(join(root, f), "utf8"));

export function facts() {
  const { orgs, countries } = json("data/orgs.json");
  return {
    orgsHeadline: "450+",
    hofHeadline: "250+",
    first: orgs.filter((o) => o.first).length,
    publicPages: orgs.filter((o) => o.url).length,
    countries: countries.filter((c) => c.lat !== null && c.count > 0).length,
  };
}

// The private file holds client engagements and references. It is gitignored and never
// published, because the repository is public. See tools/cv/README.md for its shape.
export const PRIVATE_FILE = join(root, "private/cv-clients.json");
export const loadPrivate = () => (existsSync(PRIVATE_FILE) ? JSON.parse(readFileSync(PRIVATE_FILE, "utf8")) : null);

const CONTACT = [
  { text: "parth.narula@scriptjacker.in", href: "mailto:parth.narula@scriptjacker.in", strong: true },
  { text: "+91 74970 54662", href: "tel:+917497054662" },
  { text: "India", lineEnd: true },
  { text: "parthnarula.scriptjacker.in", href: "https://parthnarula.scriptjacker.in/" },
  { text: "linkedin.com/in/parth-narula-86283821a", href: "https://www.linkedin.com/in/parth-narula-86283821a/" },
  { text: "github.com/scriptjacker", href: "https://github.com/scriptjacker" },
];

const SKILLS = [
  ["Penetration testing", "Vulnerability Assessment and Penetration Testing (VAPT), web application penetration testing, API security testing (REST and GraphQL), Android and mobile application security testing, network penetration testing, cloud security assessment, LLM and AI application security, reconnaissance and OSINT, manual exploitation, proof of concept (PoC) development"],
  ["Vulnerability classes", "broken access control (IDOR, BOLA), business logic flaws, authentication and session management, OAuth 2.0 and OpenID Connect (redirect URI validation, missing PKCE), server side request forgery (SSRF), SQL injection (SQLi), cross site scripting (XSS), cross site request forgery (CSRF), server side template injection (SSTI), race conditions, mass assignment, CORS misconfiguration, subdomain takeover, sensitive data exposure, prompt injection"],
  ["Standards and process", "OWASP Top 10, OWASP API Security Top 10, OWASP Top 10 for LLM Applications, CVSS severity scoring, risk rating, secure SDLC, DevSecOps and CI/CD security, SAST, DAST and SCA, vulnerability management, coordinated vulnerability disclosure, technical report writing, remediation guidance and retesting"],
  ["Security tools", "Burp Suite, OWASP ZAP, Nmap, Metasploit, Wireshark, Postman, Kali Linux, Android Studio, Git, Cisco Packet Tracer"],
  ["Platforms and cloud", "Linux, Windows, Active Directory, AWS, Microsoft Azure and Azure AD, Google Cloud (GCP), Firebase, containers and container security, Apache, Nginx, TCP/IP, DNS, firewalls"],
  ["Programming and scripting", "Python, Bash, JavaScript, PHP, SQL, Ruby, C, C++, HTML, CSS"],
];

const CERTS = [
  ["Certified Ethical Hacker (CEH v13)", "EC-Council", "Nov 2025"],
  ["Web Application Penetration Tester eXtreme (eWPTX v3)", "INE Security", "Dec 2025"],
  ["eLearnSecurity Junior Penetration Tester (eJPT v2)", "INE Security", "Jan 2026"],
  ["APIsec Certified Practitioner (ACP)", "APIsec University", "Mar 2026"],
  ["Ethical Hacker", "Cisco Networking Academy", "Nov 2025"],
  ["Ethical Hacking Essentials (EHE)", "EC-Council", "Feb 2022"],
];

const EDUCATION = [
  { title: "Bachelor of Computer Applications (BCA), Cybersecurity", org: "Lovely Professional University, Phagwara, Punjab", note: "CGPA 9.75", when: "Aug 2025 to Present" },
  { title: "Senior Secondary (Class XII), Commerce", org: "Vishvas Senior Secondary School, Hisar, Haryana", note: "86%", when: "Mar 2025" },
  { title: "Matriculation (Class X)", org: "St. Mary's School, Hisar, Haryana", note: "84%", when: "Mar 2023" },
];

export function buildCv({ variant = "public", priv = null } = {}) {
  const f = facts();
  const withClients = variant === "clients";
  if (withClients && !priv) throw new Error(`the client version needs ${PRIVATE_FILE}`);

  const headline = withClients
    ? "Penetration Tester | Application Security Consultant | Security Researcher"
    : "Penetration Tester and Security Researcher | Web, API, Mobile, Cloud and AI Security";

  const summary = withClients
    ? `Penetration tester and application security consultant who runs manual VAPT engagements for SaaS companies in the Netherlands, Belgium, Germany and Slovenia through ScriptJacker LLP, covering web applications, APIs, Android apps and cloud. ${f.orgsHeadline} organizations have fixed vulnerabilities I reported, among them Apple, NVIDIA, Nokia, WHO, CERT-EU and the United Nations, with ${f.hofHeadline} Hall of Fame listings and first researcher status at ${f.first} programs. Credited in Netwrix advisory ADV-2026-018 (CVSS 9.0) and CVE-2025-56697. CEH, eWPTX, eJPT and APIsec certified. Seeking a Penetration Tester, Security Consultant or Application Security Engineer role.`
    : `Penetration tester and security researcher with hands on experience in web application, API, Android, cloud and AI security testing. ${f.orgsHeadline} organizations have fixed vulnerabilities I reported, among them Apple, NVIDIA, Nokia, WHO, CERT-EU and the United Nations, with ${f.hofHeadline} Hall of Fame listings and first researcher status at ${f.first} programs. Credited in Netwrix advisory ADV-2026-018 (CVSS 9.0) and CVE-2025-56697. Founder of ScriptJacker LLP, delivering manual VAPT to 150+ clients. CEH, eWPTX, eJPT and APIsec certified. Seeking a Penetration Tester, VAPT Analyst or Application Security Engineer role.`;

  const scriptjacker = {
    type: "job",
    title: "Founder and Lead Penetration Tester",
    org: "ScriptJacker LLP",
    when: "2023 to Present",
    bullets: [
      "Lead manual Vulnerability Assessment and Penetration Testing (VAPT) for 150+ clients across web applications, REST and GraphQL APIs, Android apps and networks, reporting 2,500+ vulnerabilities through to remediation.",
      "Scope each engagement with the client on a discovery call, test against the OWASP Top 10 and OWASP API Security Top 10, and deliver reports with CVSS ratings, reproduction steps, business impact and remediation guidance.",
      "Test multi tenant SaaS platforms with separate tenant and role accounts to prove tenant isolation, role based access control and API authorization.",
      "Combine SAST and software composition analysis (SCA) with dynamic testing (DAST) on mobile and web projects, and review CI/CD pipelines as part of secure SDLC work.",
      "Retest every fix and walk development teams through findings on calls until each issue is closed.",
    ],
  };
  if (withClients) {
    scriptjacker.bullets.splice(2, 1);
    scriptjacker.subhead = "Selected client engagements";
    scriptjacker.engagements = priv.engagements;
    if (priv.otherClients) scriptjacker.otherClients = priv.otherClients;
  }

  const research = {
    type: "job",
    title: "Security Researcher",
    org: "Independent, vulnerability disclosure and bug bounty programs",
    when: "Nov 2023 to Present",
    bullets: [
      `Reported vulnerabilities to ${f.orgsHeadline} organizations in ${f.countries}+ countries, including Apple, NVIDIA, Nokia, WHO, UNESCO, CERT-EU and the United Nations, earning ${f.hofHeadline} Hall of Fame listings and first researcher status at ${f.first} programs.`,
      "Found two flaws in Netwrix PingCastle, an Active Directory security assessment tool: an update installed with no integrity check and a path traversal through prefix matching. Published as Netwrix advisory ADV-2026-018 at CVSS 9.0, with two CVEs pending.",
      "Published CVE-2025-56697 for a stored XSS, and coordinated SQL injection and information disclosure fixes through CERT-In on Indian government assets.",
      "Exploited an IDOR that exposed 85,000+ email addresses, a mass assignment flaw leading to account takeover, and an exposed Apache Guacamole gateway on a Nokia subdomain, found through Google dorking, that led to shell access.",
      "Tested cloud and AI attack surfaces: subdomain takeover through a dangling AWS CNAME, Azure AD tenant disclosure, exposed managed databases, Firebase authentication enumeration, and OAuth flaws and blind SSRF in Model Context Protocol (MCP) servers.",
    ],
  };
  if (withClients) research.bullets.splice(3, 1);

  const mentor = {
    type: "job",
    title: "Mentor, Bug Bounty and Web Security",
    org: "Unihackers",
    when: "Jun 2025 to Present",
    bullets: [
      "Mentor students and new bug hunters using real cases from my own reports, and write guides on API security testing, request tampering and prompt injection.",
      "Delivered a web application penetration testing masterclass to about 150 students at Guru Jambheshwar University of Science and Technology, Hisar (Oct 2025), and a 57 slide AI security talk with live demos.",
    ],
  };
  if (withClients) mentor.bullets = [mentor.bullets[0]];

  const intern = {
    type: "job",
    title: "Penetration Tester Intern",
    org: "Forensic Academy",
    when: "Aug 2023 to Sep 2023",
    bullets: ["Built and secured an enterprise network in Cisco Packet Tracer, ran a web application penetration test against a live target and delivered the written report. Graded A+."],
  };

  const achievements = [
    "AIR 21 of 10,000 participants at the HackWithIndia 2026 Web Hacking Competition.",
    "Team lead of ScriptJackers: 9 CTF podium finishes with 7 first places, including 1st of 68 squads at Cyber Arena 2026 (CompTIA and Quick Heal Academy), the TechFusion 2026 CTF, Rootbreach at NIT Jalandhar, Cyber War 2026, RCS 2026, Cyberthon 2026 and Encrypted CTF.",
    "Letters of appreciation from Thales PSIRT, Drexel University (CISO), Maastricht University, GeeksforGeeks and Nykaa, among others.",
  ];
  if (withClients) achievements.splice(2, 1);

  const projects = [
    { title: "Agent driven reconnaissance and penetration testing", org: "Python, private, in progress", when: "Jun 2026 to Present", text: "Layers of models plan a test and choose the approach per target instead of one fixed methodology, calling my own scripts and wordlists when needed." },
    { title: "ScriptJacker Recon Tool", org: "Python, Ruby, Bash, github.com/scriptjacker/scriptjacker", when: "May 2024", text: "Runs full reconnaissance in one pass: subdomain enumeration, directory brute forcing, DNS recon, JavaScript analysis and vulnerability scanning." },
  ];

  const sections = [
    { heading: "Professional Summary", blocks: [{ type: "para", text: summary }] },
    { heading: "Skills", blocks: SKILLS.map(([label, text]) => ({ type: "kv", label, text })) },
    { heading: "Work Experience", blocks: [scriptjacker, research, mentor, intern] },
    { heading: "Certifications", blocks: CERTS.map(([name, issuer, when]) => ({ type: "line", strong: name, rest: issuer, when })) },
    { heading: "Achievements", blocks: [{ type: "bullets", items: achievements }] },
    { heading: "Projects", blocks: projects.map((p) => ({ type: "job", inlineDate: true, title: p.title, org: p.org, when: p.when, text: p.text })) },
    { heading: "Education", blocks: EDUCATION.map((e) => ({ type: "line", strong: e.title, rest: e.org, when: e.when, note: e.note })) },
  ];
  if (withClients && priv.references?.length) {
    sections.push({
      heading: "References",
      blocks: priv.references.map((r) => ({ type: "line", strong: r.name, rest: [r.role, r.org, r.email].filter(Boolean).join(", ") })),
    });
  }

  return {
    file: withClients ? "Parth-Narula-CV-Penetration-Tester" : "Parth-Narula-CV",
    meta: {
      title: `Parth Narula, ${withClients ? "Penetration Tester" : "Penetration Tester and Security Researcher"}, CV`,
      author: "Parth Narula",
      subject: "Curriculum vitae",
      keywords: "penetration tester, VAPT, application security, web application security, API security, bug bounty, OWASP, Burp Suite",
    },
    name: "Parth Narula",
    headline,
    contact: CONTACT,
    sections,
  };
}
