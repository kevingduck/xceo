import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Users,
  UserPlus,
  Briefcase,
  UserSearch,
  Mail,
  Building2,
  Calendar,
  BadgeDollarSign,
  GraduationCap,
  MapPin,
  Globe,
  Star,
  Pencil,
  Trash2,
  Upload,
  File,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Form schemas
const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  email: z.string().email("Invalid email address"),
  startDate: z.string(),
  skills: z.string(),
  bio: z.string().optional(),
  salary: z.string().optional(),
});

const positionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string(),
  minSalary: z.string().optional(),
  maxSalary: z.string().optional(),
  location: z.string().optional(),
  remoteAllowed: z.boolean().default(false),
});

const candidateSchema = z.object({
  positionId: z.number(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  resumeUrl: z.string().url("Must be a valid URL").optional(),
  skills: z.string(),
  experienceYears: z.string(),
  highlights: z.string(),
  notes: z.string().optional(),
  rating: z.string().optional(),
});

export default function TeamPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTeamMember, setEditingTeamMember] = useState<any>(null);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [showCandidateForm, setShowCandidateForm] = useState(false);

  // Fetch data
  const { data: teamMembers, isLoading: isLoadingTeam } = useQuery({
    queryKey: ["/api/team-members"],
  });

  const { data: positions, isLoading: isLoadingPositions } = useQuery({
    queryKey: ["/api/positions"],
  });

  const { data: candidates, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  // Add team member mutation
  const addTeamMember = useMutation({
    mutationFn: async (data: z.infer<typeof teamMemberSchema>) => {
      const res = await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          skills: data.skills.split(",").map((s) => s.trim()),
          salary: data.salary ? parseInt(data.salary) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Team member added",
        description: "The team member has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add position mutation
  const addPosition = useMutation({
    mutationFn: async (data: z.infer<typeof positionSchema>) => {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          requirements: data.requirements.split(",").map((r) => r.trim()),
          salary: data.minSalary && data.maxSalary
            ? {
                min: parseInt(data.minSalary),
                max: parseInt(data.maxSalary),
                currency: "USD",
              }
            : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({
        title: "Position added",
        description: "The position has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add candidate mutation
  const addCandidate = useMutation({
    mutationFn: async (data: z.infer<typeof candidateSchema>) => {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          skills: data.skills.split(",").map((s) => s.trim()),
          experience: {
            years: parseInt(data.experienceYears),
            highlights: data.highlights.split(",").map((h) => h.trim()),
          },
          rating: data.rating ? parseInt(data.rating) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidate added",
        description: "The candidate has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutations
  const deleteTeamMember = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/team-members/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Team member deleted",
        description: "The team member has been deleted successfully.",
      });
    },
  });

  const deletePosition = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/positions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({
        title: "Position deleted",
        description: "The position has been deleted successfully.",
      });
    },
  });

  const deleteCandidate = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidate deleted",
        description: "The candidate has been deleted successfully.",
      });
    },
  });

  // Add file upload mutation
  const uploadFile = useMutation({
    mutationFn: async ({ file, entityType, entityId }: { file: File; entityType: string; entityId: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId.toString());

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_, { entityType }) => {
      queryClient.invalidateQueries({
        queryKey:
          entityType === "candidate" ? ["/api/candidates"] : ["/api/positions"],
      });
      toast({
        title: "File uploaded",
        description: "The file has been uploaded successfully.",
      });
    },
  });

  // Update mutations
  const updateTeamMember = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof teamMemberSchema> }) => {
      const res = await fetch(`/api/team-members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setEditingTeamMember(null);
      toast({
        title: "Team member updated",
        description: "The team member has been updated successfully.",
      });
    },
  });

  const updatePosition = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof positionSchema> }) => {
      const res = await fetch(`/api/positions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setEditingPosition(null);
      toast({
        title: "Position updated",
        description: "The position has been updated successfully.",
      });
    },
  });

  const updateCandidate = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof candidateSchema> }) => {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setEditingCandidate(null);
      toast({
        title: "Candidate updated",
        description: "The candidate has been updated successfully.",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, entityType: string, entityId: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile.mutateAsync({ file, entityType, entityId });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  // Form hooks
  const teamMemberForm = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      role: "",
      department: "",
      email: "",
      startDate: new Date().toISOString().split("T")[0],
      skills: "",
      bio: "",
      salary: "",
    },
  });

  const positionForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: "",
      department: "",
      description: "",
      requirements: "",
      minSalary: "",
      maxSalary: "",
      location: "",
      remoteAllowed: false,
    },
  });

  const candidateForm = useForm<z.infer<typeof candidateSchema>>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      positionId: 0,
      name: "",
      email: "",
      phone: "",
      resumeUrl: "",
      skills: "",
      experienceYears: "",
      highlights: "",
      notes: "",
      rating: "",
    },
  });

  // Reset form when editing is canceled
  const cancelEdit = (type: 'team' | 'position' | 'candidate') => {
    switch (type) {
      case 'team':
        setEditingTeamMember(null);
        teamMemberForm.reset();
        break;
      case 'position':
        setEditingPosition(null);
        positionForm.reset();
        break;
      case 'candidate':
        setEditingCandidate(null);
        candidateForm.reset();
        break;
    }
  };

  // Set form values when editing
  const startEdit = (type: 'team' | 'position' | 'candidate', item: any) => {
    switch (type) {
      case 'team':
        setEditingTeamMember(item);
        setShowTeamForm(true);
        teamMemberForm.reset({
          name: item.name,
          role: item.role,
          department: item.department,
          email: item.email,
          startDate: new Date(item.startDate).toISOString().split('T')[0],
          skills: item.skills.join(', '),
          bio: item.bio,
          salary: item.salary?.toString(),
        });
        break;
      case 'position':
        setEditingPosition(item);
        setShowPositionForm(true);
        positionForm.reset({
          title: item.title,
          department: item.department,
          description: item.description,
          requirements: item.requirements.join(', '),
          minSalary: item.salary?.min.toString(),
          maxSalary: item.salary?.max.toString(),
          location: item.location,
          remoteAllowed: item.remoteAllowed,
        });
        break;
      case 'candidate':
        setEditingCandidate(item);
        setShowCandidateForm(true);
        candidateForm.reset({
          positionId: item.positionId,
          name: item.name,
          email: item.email,
          phone: item.phone,
          resumeUrl: item.resumeUrl,
          skills: item.skills.join(', '),
          experienceYears: item.experience.years.toString(),
          highlights: item.experience.highlights.join(', '),
          notes: item.notes,
          rating: item.rating?.toString(),
        });
        break;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Team Management</h1>
      </div>

      <Tabs defaultValue="team">
        <TabsList className="mb-4">
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="positions">
            <Briefcase className="mr-2 h-4 w-4" />
            Open Positions
          </TabsTrigger>
          <TabsTrigger value="candidates">
            <UserSearch className="mr-2 h-4 w-4" />
            Candidates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="mb-4">
            <Button 
              onClick={() => {
                setShowTeamForm(!showTeamForm);
                if (!showTeamForm) {
                  cancelEdit('team');
                }
              }}
              variant="outline"
              className="w-full justify-between"
            >
              <span className="flex items-center">
                <UserPlus className="mr-2 h-4 w-4" />
                {editingTeamMember ? "Edit Team Member" : "Add Team Member"}
              </span>
              {showTeamForm ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {showTeamForm && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <Form {...teamMemberForm}>
                  <form onSubmit={teamMemberForm.handleSubmit((data) =>
                    editingTeamMember
                      ? updateTeamMember.mutate({ id: editingTeamMember.id, data })
                      : addTeamMember.mutate(data)
                  )}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={teamMemberForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamMemberForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <Input placeholder="Software Engineer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamMemberForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input placeholder="Engineering" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamMemberForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamMemberForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamMemberForm.control}
                        name="skills"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skills (comma-separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="React, TypeScript, Node.js" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamMemberForm.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salary (optional)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="60000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            cancelEdit('team');
                            setShowTeamForm(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingTeamMember ? "Update Team Member" : "Add Team Member"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingTeam ? (
              <p>Loading team members...</p>
            ) : teamMembers?.length === 0 ? (
              <p>No team members yet.</p>
            ) : (
              teamMembers?.map((member: any) => (
                <Card key={member.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {member.name}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit('team', member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTeamMember.mutate(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>{member.role}</span>
                      </div>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>{member.department}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        <span>{member.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Started: {new Date(member.startDate).toLocaleDateString()}</span>
                      </div>
                      {member.salary && (
                        <div className="flex items-center">
                          <BadgeDollarSign className="mr-2 h-4 w-4" />
                          <span>${member.salary.toLocaleString()}</span>
                        </div>
                      )}
                      {member.skills && (
                        <div className="flex items-center">
                          <GraduationCap className="mr-2 h-4 w-4" />
                          <div className="flex flex-wrap gap-1">
                            {member.skills.map((skill: string, index: number) => (
                              <span
                                key={index}
                                className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="positions">
          <div className="mb-4">
            <Button 
              onClick={() => {
                setShowPositionForm(!showPositionForm);
                if (!showPositionForm) {
                  cancelEdit('position');
                }
              }}
              variant="outline"
              className="w-full justify-between"
            >
              <span className="flex items-center">
                <Briefcase className="mr-2 h-4 w-4" />
                {editingPosition ? "Edit Position" : "Add Position"}
              </span>
              {showPositionForm ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {showPositionForm && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <Form {...positionForm}>
                  <form onSubmit={positionForm.handleSubmit((data) =>
                    editingPosition
                      ? updatePosition.mutate({ id: editingPosition.id, data })
                      : addPosition.mutate(data)
                  )}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={positionForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Senior Software Engineer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={positionForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input placeholder="Engineering" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={positionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the role and responsibilities"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={positionForm.control}
                        name="requirements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Requirements (comma-separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="5+ years experience, React, Node.js" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={positionForm.control}
                          name="minSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Salary</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="60000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={positionForm.control}
                          name="maxSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Salary</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="80000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={positionForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="New York, NY" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={positionForm.control}
                        name="remoteAllowed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Remote Work Allowed
                              </FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {/* File upload field */}
                      <div className="md:col-span-2">
                        <FormLabel>Attachments</FormLabel>
                        <Input
                          type="file"
                          onChange={(e) => editingPosition && handleFileUpload(e, "position", editingPosition.id)}
                          disabled={!editingPosition}
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            cancelEdit('position');
                            setShowPositionForm(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingPosition ? "Update Position" : "Add Position"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingPositions ? (
              <p>Loading positions...</p>
            ) : positions?.length === 0 ? (
              <p>No open positions.</p>
            ) : (
              positions?.map((position: any) => (
                <Card key={position.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {position.title}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit('position', position)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePosition.mutate(position.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>{position.department}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {position.description}
                      </p>
                      {position.salary && (
                        <div className="flex items-center">
                          <BadgeDollarSign className="mr-2 h-4 w-4" />
                          <span>
                            ${position.salary.min.toLocaleString()} - ${position.salary.max.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{position.location}</span>
                      </div>
                      {position.remoteAllowed && (
                        <div className="flex items-center">
                          <Globe className="mr-2 h-4 w-4" />
                          <span>Remote work allowed</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <GraduationCap className="mr-2 h-4 w-4" />
                        <div className="flex flex-wrap gap-1">
                          {position.requirements.map((req: string, index: number) => (
                            <span
                              key={index}
                              className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="candidates">
          <div className="mb-4">
            <Button 
              onClick={() => {
                setShowCandidateForm(!showCandidateForm);
                if (!showCandidateForm) {
                  cancelEdit('candidate');
                }
              }}
              variant="outline"
              className="w-full justify-between"
            >
              <span className="flex items-center">
                <UserSearch className="mr-2 h-4 w-4" />
                {editingCandidate ? "Edit Candidate" : "Add Candidate"}
              </span>
              {showCandidateForm ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {showCandidateForm && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <Form {...candidateForm}>
                  <form onSubmit={candidateForm.handleSubmit((data) =>
                    editingCandidate
                      ? updateCandidate.mutate({ id: editingCandidate.id, data })
                      : addCandidate.mutate(data)
                  )}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={candidateForm.control}
                        name="positionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              >
                                <option value={0}>Select a position</option>
                                {positions?.map((position: any) => (
                                  <option key={position.id} value={position.id}>
                                    {position.title}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 234 567 8900" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="resumeUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resume URL (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/resume.pdf" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="skills"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skills (comma-separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="React, TypeScript, Node.js" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="experienceYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Years of Experience</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="highlights"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Experience Highlights (comma-separated)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Led a team of 5, Increased performance by 50%, Reduced costs by 30%"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional notes about the candidate"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={candidateForm.control}
                        name="rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rating (1-5)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                placeholder="4"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* File upload field */}
                      <div className="md:col-span-2">
                        <FormLabel>Attachments</FormLabel>
                        <Input
                          type="file"
                          onChange={(e) => editingCandidate && handleFileUpload(e, "candidate", editingCandidate.id)}
                          disabled={!editingCandidate}
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            cancelEdit('candidate');
                            setShowCandidateForm(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingCandidate ? "Update Candidate" : "Add Candidate"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingCandidates ? (
              <p>Loading candidates...</p>
            ) : candidates?.length === 0 ? (
              <p>No candidates yet.</p>
            ) : (
              candidates?.map((candidate: any) => (
                <Card key={candidate.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {candidate.name}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit('candidate', candidate)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCandidate.mutate(candidate.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        <span>{candidate.email}</span>
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4" />
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>{candidate.experience.years} years experience</span>
                      </div>
                      {candidate.rating && (
                        <div className="flex items-center">
                          <Star className="mr-2 h-4 w-4" />
                          <span>{candidate.rating}/5</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <GraduationCap className="mr-2 h-4 w-4" />
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.map((skill: string, index: number) => (
                            <span
                              key={index}
                              className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      {candidate.notes && (
                        <p className="text-sm text-muted-foreground">
                          {candidate.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}