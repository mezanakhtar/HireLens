import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Mail, MessageSquare, MapPin, Send } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

type ContactData = z.infer<typeof contactSchema>;

const contactInfo = [
  { icon: <Mail className="h-5 w-5 text-primary" />, label: "Email", value: "hello@hirelens.app" },
  { icon: <MessageSquare className="h-5 w-5 text-primary" />, label: "Support", value: "support@hirelens.app" },
  { icon: <MapPin className="h-5 w-5 text-primary" />, label: "Location", value: "Remote — Worldwide" },
];

export default function Contact() {
  const { toast } = useToast();
  const form = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = async (data: ContactData) => {
    try {
      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, "feedback"), {
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          createdAt: serverTimestamp(),
        });
      }
      form.reset();
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
    } catch {
      toast({
        title: "Failed to send",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-14 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Have a question, suggestion, or just want to say hi? We'd love to hear from you.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Info */}
        <div className="space-y-4">
          {contactInfo.map((info) => (
            <Card key={info.label} className="border-border/60">
              <CardContent className="pt-5 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                  {info.icon}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">{info.label}</div>
                  <div className="text-sm font-medium mt-0.5">{info.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form */}
        <div className="md:col-span-2">
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="Jane Doe"
                      autoComplete="name"
                      aria-describedby={form.formState.errors.name ? "contact-name-error" : undefined}
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p id="contact-name-error" className="text-xs text-destructive" role="alert">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-describedby={form.formState.errors.email ? "contact-email-error" : undefined}
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p id="contact-email-error" className="text-xs text-destructive" role="alert">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-subject">Subject</Label>
                  <Input
                    id="contact-subject"
                    placeholder="How can we help?"
                    aria-describedby={form.formState.errors.subject ? "contact-subject-error" : undefined}
                    {...form.register("subject")}
                  />
                  {form.formState.errors.subject && (
                    <p id="contact-subject-error" className="text-xs text-destructive" role="alert">
                      {form.formState.errors.subject.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Tell us more..."
                    rows={5}
                    aria-describedby={form.formState.errors.message ? "contact-message-error" : undefined}
                    {...form.register("message")}
                  />
                  {form.formState.errors.message && (
                    <p id="contact-message-error" className="text-xs text-destructive" role="alert">
                      {form.formState.errors.message.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="gap-2 w-full sm:w-auto"
                  aria-label={form.formState.isSubmitting ? "Sending message…" : "Send message"}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {form.formState.isSubmitting ? "Sending…" : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
