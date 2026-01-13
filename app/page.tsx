import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">DailyPost</div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your voice, amplified.
            <span className="block text-blue-600">Every single day.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            DailyPost learns your writing style and generates LinkedIn & X content 
            suggestions based on the latest news in your industry. Wake up to fresh, 
            on-brand posts ready to review.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              Start for free
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-lg transition-colors"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="how-it-works" className="mt-32 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Learn Your Voice</h3>
            <p className="text-gray-600">
              Complete a 15-minute onboarding to teach our AI your unique writing style, 
              topics, and preferences.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📰</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Monitor News</h3>
            <p className="text-gray-600">
              We scan industry news sources and identify stories relevant to your 
              expertise and interests.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Generate Daily</h3>
            <p className="text-gray-600">
              Every morning, find 6-8 post suggestions waiting for you. Review, edit, 
              and post in minutes.
            </p>
          </div>
        </div>

        {/* How it works steps */}
        <div className="mt-32 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Complete Onboarding</h3>
                <p className="text-gray-600">
                  Spend 15-30 minutes teaching DailyPost about your role, topics, and writing style. 
                  Write sample posts, rate post types, and define your tone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Daily Generation</h3>
                <p className="text-gray-600">
                  Every night at 11pm, we scan news sources, find relevant stories, 
                  and generate personalized LinkedIn and X posts in your voice.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Morning Review</h3>
                <p className="text-gray-600">
                  Wake up to fresh suggestions. Mark as posted, edit and post, save for later, 
                  or skip. We learn from your choices to improve over time.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Continuous Learning</h3>
                <p className="text-gray-600">
                  The more you use DailyPost, the better it gets. We analyze which posts you use, 
                  how you edit them, and what you skip to refine our suggestions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to amplify your voice?</h2>
          <p className="text-gray-600 mb-8">
            Join professionals who publish consistently without the daily grind.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-20 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-gray-600">
            © {new Date().getFullYear()} DailyPost. All rights reserved.
          </div>
          <div className="flex gap-6 text-gray-600">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
