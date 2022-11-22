import { Box, ListItem, OrderedList, Text } from "@chakra-ui/react";
import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../Socket";


export default function Leaderboard(): JSX.Element {
    const { socket, loading, id } = useContext(SocketContext);
    const [state, setState] = useState<Array<any>>([]);

    useEffect(() => {
        if (socket && !loading) {
            socket.emit("leaderboard", "emit");

            const leaderboardChannel = "leaderboard";
            const listenUsers = (usersData: any) => {
                if (Array.isArray(usersData)) {
                    setState(usersData);
                }
            };
            socket.on(leaderboardChannel, listenUsers);
        }
    }, [socket, loading]);

    return (
        <Box>
            <Text as={"u"}>Leaderboard</Text>
            <OrderedList fontSize={"md"} overflow={"hidden"} textOverflow="ellipsis" whiteSpace={"nowrap"} overflowWrap={"break-word"} >
                {state.map((user, index) => {
                    const { user_id: userId, max_avg_clicks: maxAverageClicks } = user;

                    return (
                        (userId === id) ? (
                            <ListItem textColor={"violet"}>
                                <span><b>{maxAverageClicks.toFixed(2)}</b></span>
                                -
                                <span>{userId}</span>
                            </ListItem>
                        ) : (
                            <ListItem textColor={index < 3 ? "" : "gray.400"}>
                                <span><b>{maxAverageClicks.toFixed(2)}</b></span>
                                -
                                <span>{userId}</span>
                            </ListItem>
                        )
                    )
                })}
            </OrderedList>
        </Box >
    );
}