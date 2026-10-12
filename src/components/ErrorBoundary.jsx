import { Component } from 'react';
import Button from './Button.jsx';
import './ErrorBoundary.css';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Unhandled UI error:', error, info);
    }

    handleReload = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>😕 Something went wrong</h2>
                    <p>An unexpected error occurred. Please go back to Home and try again.</p>
                    <Button onClick={this.handleReload}>Back to Home</Button>
                </div>
            );
        }
        return this.props.children;
    }
}
