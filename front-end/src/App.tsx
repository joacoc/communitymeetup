import {
  ChakraProvider,
  Box,
  Text,
  Grid,
  theme,
  Flex,
} from "@chakra-ui/react"
import Circle from "./Circle"
import { ColorModeSwitcher } from "./ColorModeSwitcher"
import Connected from "./UsersConnected"
import Socketed from "./Socket"
import Leaderboard from "./Leaderboard"

export const App = () => (
  <ChakraProvider theme={theme}>
    <Box textAlign="center" fontSize="xl">
      <Grid minH="100vh" p={3}>
        <ColorModeSwitcher justifySelf="flex-end" />
        <Text fontSize={"3xl"} fontWeight={500} as={"u"}>
          Welcome to the Materialize Community Meet Up Game!
        </Text>
        <Socketed>
          <Flex width={"100%"} overflow="hidden">
            <Box width={"25%"}>
              <Connected />
            </Box>
            <Box margin={"auto"}>
              <Circle />
            </Box>
            <Box width={"25%"}>
              <Leaderboard />
            </Box>
          </Flex>
        </Socketed>
        {/* Center in middle */}
        <Text> </Text>
      </Grid>
    </Box>
  </ChakraProvider >
)
