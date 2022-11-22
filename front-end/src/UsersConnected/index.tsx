import { Box, List, ListItem, Text } from "@chakra-ui/react";
import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Socket";

export default function UsersConnected(): JSX.Element {
    const { socket, loading, id } = useContext(SocketContext);
    const [state, setState] = useState<Set<string>>(new Set());
    const { current: currentSet } = useRef(new Set<string>());

    useEffect(() => {
        if (socket && !loading) {
            currentSet.clear();
            socket.emit("users", "emit");

            const usersChannel = "users_" + id;
            const listenUsers = (usersData: any) => {
                try {
                    usersData.forEach((user: any) => {
                        if (user.mz_diff === "1") {
                            currentSet.add(user.user_id);
                        } else {
                            currentSet.delete(user.user_id);
                        }
                    });

                    setState(new Set(currentSet));
                } catch (err) {
                    console.log("Error parsing users data: ", err);
                }
            };
            socket.on(usersChannel, listenUsers);

            return () => {
                socket.off(usersChannel, listenUsers);
            }
        }
    }, [currentSet, socket, loading, id]);

    return (
        <Box textAlign="left" fontSize="sm" textColor={"gray.500"} maxHeight="500px" overflowY={"scroll"}>
            <Text>
                Users connected:
            </Text>
            <List spacing={1} overflow={"hidden"} textOverflow="ellipsis" whiteSpace={"nowrap"} overflowWrap={"break-word"}>
                {Array.from(state.values()).map((user) =>
                    <ListItem key={user}>
                        {user}
                    </ListItem>
                )}
            </List>
        </Box>
    )
}