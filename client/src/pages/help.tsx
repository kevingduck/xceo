import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  Zap, 
  Users, 
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Building2,
  Lightbulb,
  Shield,
  Sparkles,
  HelpCircle,
  Briefcase,
  Calendar,
  ChevronRight,
  Mail
} from "lucide-react";

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      category: "Getting Started",
      icon: <Sparkles className="h-5 w-5" />,
      questions: [
        {
          q: "What is XCEO and how can it help my business?",
          a: "XCEO is an AI-powered executive assistant that helps you manage and grow your business. It provides intelligent insights, automates routine tasks, manages your team and recruitment, tracks business metrics, and offers strategic recommendations based on your business data and objectives."
        },
        {
          q: "How do I get started with XCEO?",
          a: "After signing up, you'll go through a 5-step onboarding process where you'll provide information about your business, including its name, description, objectives, team size, and revenue. This helps XCEO understand your business context and provide personalized assistance."
        },
        {
          q: "Is my business data secure?",
          a: "Yes, absolutely. We use industry-standard encryption for all data transmission and storage. Your business data is isolated from other users, and we never share your information with third parties. Only authenticated users with proper permissions can access your data."
        }
      ]
    },
    {
      category: "AI Assistant",
      icon: <MessageCircle className="h-5 w-5" />,
      questions: [
        {
          q: "What can the AI CEO assistant do?",
          a: "Your AI CEO can: create and manage tasks, update business information, add or modify team members, manage job positions and candidates, track analytics, query your business data, provide strategic recommendations, and help with decision-making based on your business context."
        },
        {
          q: "How do I ask the AI to add a team member or update information?",
          a: "Simply type your request in natural language in the chat. For example: 'Add John Smith as our new Senior Developer in the Engineering department' or 'Update Sarah's compensation to $120,000'. The AI will understand and execute these commands."
        },
        {
          q: "Can the AI make decisions without my approval?",
          a: "No, the AI assistant is designed to help and suggest, not to make autonomous decisions. It will execute specific commands you give it (like adding team members or creating tasks) but won't make strategic decisions without your explicit instruction."
        }
      ]
    },
    {
      category: "Features & Functionality",
      icon: <Zap className="h-5 w-5" />,
      questions: [
        {
          q: "What are the main features of XCEO?",
          a: "XCEO includes: AI-powered chat assistant, task management, team member tracking, recruitment pipeline management, business analytics dashboard, financial tracking, market intelligence, operations overview, and comprehensive reporting capabilities."
        },
        {
          q: "How does the recruitment pipeline work?",
          a: "You can create job positions, track candidates through various stages (new, screening, interview, offer, hired, rejected), rate candidates, add notes, and manage the entire hiring process. The AI can help you create positions and update candidate statuses."
        },
        {
          q: "Can I export my data?",
          a: "Yes, you can export your business data, team information, tasks, and analytics in various formats through the settings page. This ensures you always have access to your data outside the platform."
        }
      ]
    },
    {
      category: "Team & Collaboration",
      icon: <Users className="h-5 w-5" />,
      questions: [
        {
          q: "Can multiple team members use XCEO?",
          a: "Currently, XCEO is designed for single-user access per business account. We're working on multi-user collaboration features that will allow you to invite team members with different permission levels."
        },
        {
          q: "How do I manage team member information?",
          a: "You can add team members through the Team page or by asking the AI assistant. For each team member, you can track their role, department, skills, achievements, and other relevant information."
        },
        {
          q: "Can I track team performance and compensation?",
          a: "Yes, XCEO allows you to track team member details including compensation. You can also use the analytics features to monitor team performance metrics and generate insights about your human capital."
        }
      ]
    },
    {
      category: "Business Intelligence",
      icon: <BarChart3 className="h-5 w-5" />,
      questions: [
        {
          q: "What kind of analytics does XCEO provide?",
          a: "XCEO offers comprehensive analytics including revenue tracking, growth metrics, team analytics, task completion rates, and custom KPIs. You can view trends over time and get AI-powered insights about your business performance."
        },
        {
          q: "How often should I update my business information?",
          a: "We recommend updating key metrics weekly or monthly, depending on your business pace. The AI assistant can remind you to update important information and can help you maintain accurate, up-to-date records."
        },
        {
          q: "Can I customize the dashboard and reports?",
          a: "The dashboard shows key metrics relevant to your business. While the current version has a standard layout, you can ask the AI to focus on specific metrics or generate custom reports based on your needs."
        }
      ]
    },
    {
      category: "Pricing & Billing",
      icon: <DollarSign className="h-5 w-5" />,
      questions: [
        {
          q: "What does XCEO cost?",
          a: "XCEO offers different pricing tiers based on your business size and needs. Visit our pricing page for current plans. We offer a free trial so you can experience the full capabilities before committing."
        },
        {
          q: "Can I change or cancel my plan?",
          a: "Yes, you can upgrade, downgrade, or cancel your plan at any time from the settings page. Changes take effect at the next billing cycle, and we offer prorated refunds for annual plans."
        },
        {
          q: "Is there a limit on AI interactions?",
          a: "Depending on your plan, there may be limits on AI interactions per month. Higher-tier plans offer unlimited AI interactions. Check your plan details in the settings page."
        }
      ]
    }
  ];

  const guides = [
    {
      title: "Quick Start Guide",
      icon: <BookOpen className="h-6 w-6" />,
      description: "Get up and running with XCEO in minutes",
      steps: [
        "Complete the onboarding process with your business information",
        "Explore the dashboard to see your business overview",
        "Chat with your AI CEO to create your first tasks",
        "Add your team members and current positions",
        "Set up your key business metrics and objectives"
      ]
    },
    {
      title: "Using the AI Assistant",
      icon: <MessageCircle className="h-6 w-6" />,
      description: "Make the most of your AI CEO",
      steps: [
        "Use natural language to communicate - no special commands needed",
        "Ask it to create tasks, update information, or provide insights",
        "Request reports and analysis of your business data",
        "Get strategic recommendations based on your objectives",
        "Use it as a sounding board for business decisions"
      ]
    },
    {
      title: "Managing Your Team",
      icon: <Users className="h-6 w-6" />,
      description: "Track and grow your human capital",
      steps: [
        "Add team members with their roles and departments",
        "Track skills, achievements, and compensation",
        "Create job positions for hiring needs",
        "Manage candidates through the recruitment pipeline",
        "Monitor team analytics and performance"
      ]
    },
    {
      title: "Business Intelligence",
      icon: <TrendingUp className="h-6 w-6" />,
      description: "Leverage data for better decisions",
      steps: [
        "Set up your key performance indicators (KPIs)",
        "Regularly update business metrics",
        "Review analytics dashboards for trends",
        "Ask the AI for insights and recommendations",
        "Export reports for stakeholder meetings"
      ]
    }
  ];

  const tips = [
    {
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      title: "Pro Tip: Daily Check-ins",
      content: "Start each day by asking your AI CEO 'What should I focus on today?' for personalized priorities based on your objectives and current tasks."
    },
    {
      icon: <Target className="h-5 w-5 text-blue-500" />,
      title: "Set SMART Objectives",
      content: "When setting business objectives, make them Specific, Measurable, Achievable, Relevant, and Time-bound for better AI recommendations."
    },
    {
      icon: <Shield className="h-5 w-5 text-green-500" />,
      title: "Regular Data Backups",
      content: "Export your data regularly from the settings page to maintain your own backups and records."
    },
    {
      icon: <Zap className="h-5 w-5 text-purple-500" />,
      title: "Automate Routine Tasks",
      content: "Let your AI CEO handle routine updates and data entry. Focus your time on strategic decisions and growth."
    }
  ];

  const filteredFAQs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Help Center</h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to know about using XCEO to grow your business
        </p>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-lg"
          />
        </div>
      </div>

      <Tabs defaultValue="guides" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guides">Getting Started</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact Support</TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {guides.map((guide, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {guide.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{guide.title}</CardTitle>
                      <CardDescription>{guide.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-primary mt-0.5">
                          {stepIndex + 1}.
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Quick Tips</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {tips.map((tip, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {tip.icon}
                      <CardTitle className="text-base">{tip.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{tip.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-8">
          {searchQuery && (
            <p className="text-sm text-muted-foreground">
              Showing results for "{searchQuery}"
            </p>
          )}
          
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-muted-foreground">
                  Try searching with different keywords or browse all FAQs below
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  {category.icon}
                  <h2 className="text-2xl font-semibold">{category.category}</h2>
                </div>
                
                <Accordion type="single" collapsible className="space-y-4">
                  {category.questions.map((item, index) => (
                    <AccordionItem key={index} value={`${categoryIndex}-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="contact" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Get in Touch</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Our support team is here to help.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Mail className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Email Support</h3>
                      <p className="text-sm text-muted-foreground">
                        support@xceo.ai
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We respond within 24 hours
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <MessageCircle className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Live Chat</h3>
                      <p className="text-sm text-muted-foreground">
                        Available Mon-Fri, 9am-5pm PST
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Start Chat
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Calendar className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Schedule a Demo</h3>
                      <p className="text-sm text-muted-foreground">
                        Get a personalized walkthrough
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Book Demo
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <Building2 className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Enterprise Support</h3>
                      <p className="text-sm text-muted-foreground">
                        Priority support for teams
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-3">Before reaching out:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Check the FAQ section above
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Try asking your AI CEO assistant
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Make sure you're using the latest version
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}