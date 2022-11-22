import { Button, Text, Flex, Box } from "@chakra-ui/react"
import { useCallback, useState, useContext, useEffect } from "react";
import { SocketContext } from "../Socket";
import UserID from "../UserID";

function Circle(): JSX.Element {
    const { socket, loading } = useContext(SocketContext);
    const [start, setStart] = useState(false);
    const [, setCountdown] = useState<number>(0);
    const [tryNumber, setTryNumber] = useState<number>(1);

    useEffect(() => {
        if (start) {
            const startTime = new Date().getTime();
            const intervalId = setInterval(() => {
                const currentCountdown = startTime - new Date().getTime();
                const newCountdown = Math.abs(Number(currentCountdown))
                setCountdown(newCountdown);

                if (currentCountdown < -10000) {
                    clearInterval(intervalId);
                    setStart(false);
                    setCountdown(0);
                }
            }, 100);
        }

    }, [start]);


    /**
     * On start click event
     */
    const onStart = useCallback(() => {
        setTryNumber(tryNumber + 1);
        setStart(true);
    }, [tryNumber]);

    /**
     * Event update
     */
    const onClick = useCallback(() => {
        if (socket && start) {
            socket.emit("click", tryNumber.toString());
        }
    }, [start, socket, tryNumber]);

    return (
        <Flex flexFlow={"column"} alignItems="center" padding={"5"}>
            <Text>
                {start ? "Click click click!" : "Be prepared to click as fast as you can."}
            </Text>

            <Button disabled={!start} marginTop="5rem" height="200px" width="200px" borderRadius={"full"} background="red.400" _hover={{
                background: "red.600",
            }} onClick={onClick}>
                {start ? "Click me" : ""}
            </Button>

            <Button disabled={start || loading} marginTop="5rem" height="50px" width="100px" background="red.400" _hover={{
                background: "red.600",
            }} onClick={onStart}>
                Start
            </Button>

            <Box marginTop={"5rem"}>
                <UserID />
            </Box>
        </Flex >
    );
}

export default Circle;