import { Link } from "wouter";
import { Heart, Github, Twitch, Twitter } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-dark-surface border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-xl font-bold text-white mb-4">BGMI Tournaments</h3>
            <p className="text-gray-400 text-sm mb-4">
              The ultimate platform for competitive BGMI tournaments. Create teams, join competitions, and battle for glory.
            </p>
            <div className="flex space-x-4 text-gray-400">
              <a href="#" className="hover:text-primary">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-primary">
                <Twitch className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/" className="hover:text-primary">Home</Link>
              </li>
              <li>
                <Link href="/tournaments" className="hover:text-primary">Tournaments</Link>
              </li>
              <li>
                <Link href="/auth" className="hover:text-primary">Login / Register</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-white mb-4">User</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/user/dashboard" className="hover:text-primary">Dashboard</Link>
              </li>
              <li>
                <Link href="/user/team" className="hover:text-primary">My Team</Link>
              </li>
              <li>
                <Link href="/user/profile" className="hover:text-primary">Profile</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-white mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-primary">Help Center</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Contact Us</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Terms of Service</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} BGMI Tournament Platform. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-4 sm:mt-0 flex items-center">
            Made with <Heart className="h-4 w-4 text-red-500 mx-1" /> for BGMI Players
          </p>
        </div>
      </div>
    </footer>
  );
}