import { Text } from "@chakra-ui/react";
import { useContext } from "react";
import { SocketContext } from "../Socket";

export default function UserID(): JSX.Element {
    const context = useContext(SocketContext);
    const { id } = context;

    return (
        <Text textColor={"gray.400"}>
            ID: {id}
        </Text>
    )
}