import { useMenuStore } from "../../stores/Menu/MenuStore";
import Chatroom from "./Chatroom";
import Calendar from "./Calendar";
import Settings from "./Settings";

const menuComponents: Record<string, React.ReactNode> = {
  Chatroom: <Chatroom />,
  Calendar: <Calendar />,
  "User Settings": <Settings />,
};

function Main() {
  const selectedMenu = useMenuStore((state) => state.selectedMenu);

  return (
    <>
      {menuComponents[selectedMenu] || null}
    </>
  );
}

export default Main;