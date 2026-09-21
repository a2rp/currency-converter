import PublicApp from "./app/index.jsx";
import "./standalone.css";

const App = () => {
    return (
        <main className="standaloneApp">
            <PublicApp />
        </main>
    );
};

export default App;
