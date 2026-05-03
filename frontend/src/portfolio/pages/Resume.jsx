import React from 'react';
import { Download } from 'lucide-react';

const Resume = () => {
    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
            <div className="max-w-[21cm] mx-auto bg-white p-12 shadow-xl print:shadow-none print:max-w-none print:mx-0">

                {/* Header */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2 font-[Cormorant_Garamond]">The Vidhyalaya Team</h1>
                    <div className="text-sm text-gray-700 space-y-1">
                        <div className="flex flex-wrap justify-center gap-x-2">
                            <span>+91 6300272531</span>
                            <span className="text-gray-400">|</span>
                            <a href="mailto:hello@vidhyalaya.ai" className="hover:text-black hover:underline">hello@vidhyalaya.ai</a>
                            <span className="text-gray-400">|</span>
                            <a href="https://linkedin.com/company/vidhyalaya-ai" target="_blank" rel="noopener noreferrer" className="hover:text-black hover:underline">linkedin.com/company/vidhyalaya-ai</a>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-2">
                            <a href="https://github.com/Vidhyalaya-Collective" target="_blank" rel="noopener noreferrer" className="hover:text-black hover:underline">github.com/Vidhyalaya-Collective</a>
                            <span className="text-gray-400">|</span>
                            <a href="https://vidhyalaya.ai" target="_blank" rel="noopener noreferrer" className="hover:text-black hover:underline">vidhyalaya.ai</a>
                        </div>
                        <div className="mt-1">Tirupati, India</div>
                    </div>
                </header>

                {/* Professional Summary */}
                <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-400 mb-3 pb-1 tracking-wide">Professional Summary</h2>
                    <p className="text-gray-800 text-sm leading-relaxed">
                        Computer Science undergraduate with strong foundations in backend engineering, data structures, and system design. Experienced in building and deploying production-oriented applications using Python, FastAPI, PostgreSQL, Docker, and AWS. Proven ownership of backend systems, APIs, and data modeling with a focus on reliability, scalability, and clean engineering practices.
                    </p>
                </section>

                {/* Education */}
                <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-400 mb-3 pb-1 tracking-wide">Education</h2>

                    <div className="mb-4">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-gray-900">Mohan Babu University</h3>
                            <span className="text-gray-700 text-sm">Tirupati, India</span>
                        </div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-gray-800 italic">Bachelor of Technology in Computer Science and Engineering</span>
                            <span className="text-gray-700 text-sm">Expected May 2026</span>
                        </div>
                        <div className="text-gray-700 text-sm">Cumulative GPA: 8.7/10.0</div>
                        <div className="text-gray-700 text-sm">AWS Solutions Architect – Associate (Coursework)</div>
                    </div>
                </section>

                {/* Technical Skills */}
                <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-400 mb-3 pb-1 tracking-wide">Technical Skills</h2>
                    <div className="space-y-1 text-sm text-gray-800">
                        <div>
                            <span className="font-bold">Languages:</span> Python, JavaScript
                        </div>
                        <div>
                            <span className="font-bold">Backend:</span> FastAPI, REST API Development, Authentication & Error Handling
                        </div>
                        <div>
                            <span className="font-bold">Databases:</span> PostgreSQL (Schema Design, Relational Modeling, Joins, Indexing)
                        </div>
                        <div>
                            <span className="font-bold">Cloud & Deployment:</span> Docker, AWS (EC2, S3)
                        </div>
                        <div>
                            <span className="font-bold">Foundations:</span> Data Structures & Algorithms, System Design (Foundational)
                        </div>
                        <div>
                            <span className="font-bold">Tools:</span> Git, GitHub, VS Code
                        </div>
                    </div>
                </section>

                {/* Projects */}
                <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-400 mb-3 pb-1 tracking-wide">Projects</h2>

                    {/* Sara.ai */}
                    <div className="mb-5">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-gray-900">Sara.ai – AI Learning Platform</h3>
                            <span className="text-gray-700 italic text-sm">Founder & Backend Engineer</span>
                        </div>
                        <ul className="list-disc list-outside ml-4 mt-2 space-y-1 text-sm text-gray-800 leading-relaxed">
                            <li>
                                Built an AI-powered learning platform serving <span className="font-bold">1,700+ users</span>, owning backend architecture, APIs, and database design end-to-end.
                            </li>
                            <li>
                                Implemented a scalable content retrieval system using vector-based indexing to improve content discovery and engagement.
                            </li>
                            <li>
                                Designed and deployed backend services using <span className="font-bold">FastAPI, PostgreSQL, Docker, and AWS (EC2, S3)</span>, focusing on reliability and scalability.
                            </li>
                        </ul>
                    </div>

                    {/* Automation Workflow Engine */}
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-gray-900">Automation Workflow Engine</h3>
                            <span className="text-gray-700 italic text-sm">Open Source Project</span>
                        </div>
                        <ul className="list-disc list-outside ml-4 mt-2 space-y-1 text-sm text-gray-800 leading-relaxed">
                            <li>
                                Designed a task orchestration framework with validation layers, retry mechanisms, and failure handling to improve workflow reliability.
                            </li>
                            <li>
                                Open-sourced and maintained the project, gaining community adoption and contributions.
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Experience */}
                <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-400 mb-3 pb-1 tracking-wide">Experience</h2>

                    <div className="mb-4">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-gray-900">
                                AI Engineering Consultant <span className="font-normal font-sans text-gray-600">— Vaagisha Enterprises</span>
                            </h3>
                            <span className="text-gray-700 italic text-sm">Nov 2024 – Present</span>
                        </div>
                        <ul className="list-disc list-outside ml-4 mt-2 space-y-1 text-sm text-gray-800 leading-relaxed">
                            <li>
                                Contributed to the development of an AI-assisted hiring platform, supporting candidate screening using LLM-based text analysis and backend evaluation pipelines.
                            </li>
                            <li>
                                Built backend and application logic using <span className="font-bold">Next.js</span> and serverless APIs to streamline recruiter workflows.
                            </li>
                            <li>
                                Collaborated with stakeholders to refine evaluation criteria and improve platform reliability through iterative testing.
                            </li>
                        </ul>
                    </div>
                </section>

                <div className="text-center text-xs text-gray-500 italic mt-12 print:hidden">
                    Updated: January 17, 2026
                </div>

                {/* PDF Download Button (Hidden in Print) */}
                <div className="fixed bottom-8 right-8 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
                    >
                        <Download size={20} />
                        <span>Download PDF</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Resume;
