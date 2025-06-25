import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Target, 
  Users, 
  TrendingUp, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Briefcase,
  DollarSign,
  UserPlus
} from "lucide-react";

interface OnboardingData {
  businessName: string;
  businessDescription: string;
  objectives: string[];
  teamSize: string;
  revenue: string;
  industry: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  initialData?: Partial<OnboardingData>;
}

export function OnboardingFlow({ onComplete, initialData }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  
  const [data, setData] = useState<OnboardingData>({
    businessName: initialData?.businessName || "",
    businessDescription: initialData?.businessDescription || "",
    objectives: initialData?.objectives || [],
    teamSize: initialData?.teamSize || "",
    revenue: initialData?.revenue || "",
    industry: initialData?.industry || ""
  });

  const [objectives, setObjectives] = useState(
    (initialData?.objectives || []).join("\n")
  );

  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      const objectivesList = objectives
        .split("\n")
        .map(o => o.trim())
        .filter(Boolean);
      
      onComplete({
        ...data,
        objectives: objectivesList
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.businessName.trim() && data.industry.trim();
      case 2:
        return data.businessDescription.trim();
      case 3:
        return objectives.trim();
      case 4:
        return data.teamSize && data.revenue;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <CardTitle className="text-2xl">Welcome to XCEO</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <AnimatePresence mode="wait" custom={step}>
          <motion.div
            key={step}
            custom={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold && step < totalSteps) {
                handleNext();
              } else if (swipe > swipeConfidenceThreshold && step > 1) {
                handleBack();
              }
            }}
          >
            <CardContent className="space-y-6 min-h-[400px]">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <Building2 className="h-16 w-16 mx-auto text-primary" />
                    <h3 className="text-xl font-semibold">Let's get to know your business</h3>
                    <p className="text-muted-foreground">Tell us about your company</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Business Name</label>
                      <Input
                        placeholder="Enter your business name"
                        value={data.businessName}
                        onChange={(e) => setData({ ...data, businessName: e.target.value })}
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Industry</label>
                      <Input
                        placeholder="e.g., Technology, Healthcare, Retail"
                        value={data.industry}
                        onChange={(e) => setData({ ...data, industry: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <Briefcase className="h-16 w-16 mx-auto text-primary" />
                    <h3 className="text-xl font-semibold">What does {data.businessName} do?</h3>
                    <p className="text-muted-foreground">Help us understand your business better</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Description</label>
                    <Textarea
                      placeholder="Describe your main products, services, and value proposition..."
                      value={data.businessDescription}
                      onChange={(e) => setData({ ...data, businessDescription: e.target.value })}
                      className="min-h-[200px]"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <Target className="h-16 w-16 mx-auto text-primary" />
                    <h3 className="text-xl font-semibold">What are your goals?</h3>
                    <p className="text-muted-foreground">List your key business objectives</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Objectives</label>
                    <Textarea
                      placeholder="Enter your objectives (one per line)..."
                      value={objectives}
                      onChange={(e) => setObjectives(e.target.value)}
                      className="min-h-[180px]"
                    />
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Examples:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Increase revenue by 30% this year</li>
                        <li>Launch 3 new product lines</li>
                        <li>Expand to 2 new markets</li>
                        <li>Improve customer retention by 25%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <TrendingUp className="h-16 w-16 mx-auto text-primary" />
                    <h3 className="text-xl font-semibold">Current business metrics</h3>
                    <p className="text-muted-foreground">This helps us provide better insights</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team Size
                      </label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={data.teamSize}
                        onChange={(e) => setData({ ...data, teamSize: e.target.value })}
                      >
                        <option value="">Select team size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="500+">500+ employees</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Annual Revenue
                      </label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={data.revenue}
                        onChange={(e) => setData({ ...data, revenue: e.target.value })}
                      >
                        <option value="">Select revenue range</option>
                        <option value="0-100k">$0 - $100K</option>
                        <option value="100k-500k">$100K - $500K</option>
                        <option value="500k-1m">$500K - $1M</option>
                        <option value="1m-5m">$1M - $5M</option>
                        <option value="5m-10m">$5M - $10M</option>
                        <option value="10m+">$10M+</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
                    <h3 className="text-2xl font-semibold">You're all set!</h3>
                    <p className="text-muted-foreground">
                      Your AI CEO is ready to help you manage and grow {data.businessName}
                    </p>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-6 space-y-3">
                    <h4 className="font-semibold">What happens next?</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Your AI CEO will analyze your business information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Get personalized insights and recommendations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Start managing tasks, team, and growth strategies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Track your progress towards business objectives</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        </AnimatePresence>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2"
          >
            {step === totalSteps ? (
              <>
                Complete Setup
                <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}