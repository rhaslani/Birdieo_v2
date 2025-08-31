import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
          <Card className="glass-card border-0 shadow-2xl max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <CardTitle className="text-xl font-bold text-emerald-800">
                Oops! Something went wrong
              </CardTitle>
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              <p className="text-emerald-600">
                We encountered an unexpected error. This sometimes happens on mobile devices.
              </p>
              
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-left">
                <p className="text-red-800 text-sm font-medium">Error Details:</p>
                <p className="text-red-700 text-xs mt-1 font-mono">
                  {this.state.error && this.state.error.toString()}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="btn-golf-primary w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="btn-golf-secondary w-full"
                >
                  Try Again
                </Button>
              </div>

              <div className="text-xs text-emerald-500 mt-4">
                <p>💡 Tips for mobile users:</p>
                <ul className="text-left mt-2 space-y-1">
                  <li>• Make sure you're using a modern browser</li>
                  <li>• Try refreshing the page</li>
                  <li>• Check your internet connection</li>
                  <li>• Use "Use Demo Photo" if camera issues persist</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;