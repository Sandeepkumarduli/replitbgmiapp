import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll respond shortly.",
      });
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
      
      // Reset success state after a delay
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Contact <span className="text-primary">Us</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
              Have questions about tournaments, technical issues, or partnership opportunities?
              We're here to help you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Mail className="text-primary h-10 w-10 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Email Us</h3>
              <p className="text-gray-400">support@rdtournaments.com</p>
              <p className="text-gray-400">partnerships@rdtournaments.com</p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Phone className="text-primary h-10 w-10 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Call Us</h3>
              <p className="text-gray-400">+91 98765 43210</p>
              <p className="text-gray-400">Mon-Fri, 9am - 6pm IST</p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <MapPin className="text-primary h-10 w-10 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Our Location</h3>
              <p className="text-gray-400">123 Gaming Street</p>
              <p className="text-gray-400">Bengaluru, Karnataka, India</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-surface">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Send Us A Message</h2>
            <p className="text-gray-400">
              Fill out the form below and our team will get back to you as soon as possible
            </p>
          </div>
          
          <div className="bg-dark-card border border-gray-800 rounded-lg p-8">
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="text-green-500 h-16 w-16 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-gray-400 mb-6">
                  Your message has been sent successfully. We'll get back to you shortly.
                </p>
                <Button
                  onClick={() => setIsSubmitted(false)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-gray-300 mb-2">
                      Your Name
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="bg-dark-surface border-gray-700 text-white"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-gray-300 mb-2">
                      Your Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="bg-dark-surface border-gray-700 text-white"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-gray-300 mb-2">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="bg-dark-surface border-gray-700 text-white"
                    placeholder="Tournament Inquiry"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-gray-300 mb-2">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="bg-dark-surface border-gray-700 text-white min-h-[150px]"
                    placeholder="Write your message here..."
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Find quick answers to common questions about RD Tournaments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-dark-card border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">How do I register for a tournament?</h3>
              <p className="text-gray-400">
                Create an account, build a team with the required number of members for the tournament type (Solo, Duo, or Squad), and then navigate to the tournament page to register.
              </p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">How are prizes distributed?</h3>
              <p className="text-gray-400">
                Prize distribution varies by tournament. For cash prizes, winners will be contacted directly to arrange payment. In-game rewards are usually distributed within 7-10 days after tournament completion.
              </p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">I'm having technical issues with the platform</h3>
              <p className="text-gray-400">
                Please try clearing your browser cache and cookies, or use a different browser. If problems persist, contact our support team with details of your issue and any error messages.
              </p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">How do I become a tournament partner?</h3>
              <p className="text-gray-400">
                We're always open to partnerships with gaming organizations, streamers, and sponsors. Please use our contact form with the subject "Partnership Inquiry" to start the conversation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}