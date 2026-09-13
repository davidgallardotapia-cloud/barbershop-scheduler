import React from "react";

export default class ReportsBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p role="alert">No se pudieron abrir los reportes. Recarga la página para intentarlo nuevamente.</p>;
    }
    return this.props.children;
  }
}
