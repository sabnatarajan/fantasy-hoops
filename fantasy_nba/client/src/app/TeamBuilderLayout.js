import React from 'react'
import _ from 'lodash'
import Navbar from './components/Navbar'
import { Button, Card, Dropdown, Header, Image, Popup, Container, Segment, Table } from 'semantic-ui-react'
import { Link } from 'react-router-dom'
import PlayerGrid from './components/PlayerGrid'
import axios from 'axios'

class TeamBuilderLayout extends React.Component {

  constructor(props, context) {
    super(props, context)

    this.state = {
      column: null,
      direction: null,
      team: props.team,
      players: props.players,
      filteredPosition: props.filteredPosition,
      searchFilter: Array(0),
    }
  }

  MAX_ROSTER_SIZE = 13

  setStateOnParent(nextState) {
    this.props.setStateCallback(nextState)
  }

  componentWillMount() {

    if (!this.state.players) {
      this.getOnlinePlayerData()
    }
  }

  handleFilterPosition = filterPosition => () => {
    this.setState({
      filteredPosition: filterPosition,
    }, () => this.setStateOnParent(this.state))
  }

  handeSearchFilter = (e, { value }) => {
    this.setState({
      searchFilter: value
    }, () => this.setStateOnParent(this.state))
  }

  handleClearSearch = () => {
    this.setState({
      searchFilter: Array(0),
    }, () => this.setStateOnParent({ searchFilter: Array(0) }))
  }

  getOnlinePlayerData() {
    const baseURL = process.env.NODE_ENV === "production" ? "" : "http://localhost:8000"
    axios.get(baseURL + '/api/players')
      .then(res => {
        const weights = this.props.weights

        _.map(res.data, ({ playerID, name, position, currTeamID, costYAH, costESPN,
          avPTS, avREBOff, avREBDef, avREBTot, avFGA, avFGM, avSTL,
          avBLK, avAST, avTOV, avFTA, avFTM, avPT3A, avPT3M, gPlayed,
          gamesNxtWk, avSecsPlayed, probPlay, zScores }, idx) => {

          const avDefFPtsCalc =
            weights.REBTot * avREBDef
            + weights.BLK * avBLK
            + weights.STL * avSTL
          const avDefFPts = _.round(avDefFPtsCalc, 2)

          const avOffFPtsCalc =
            weights.PTS * avPTS
            + weights.REBTot * avREBOff
            + weights.AST * avAST
            + weights.TOV * avTOV
            + weights.PT3M * avPT3M
            + weights.FTA * avFTA
            + weights.FTM * avFTM
            + weights.FGA * avFGA
            + weights.FGM * avFGM
          const avOffFPts = _.round(avOffFPtsCalc, 2)

          const avFPtsCalc =
            weights.PTS * avPTS
            + weights.REBTot * avREBOff
            + weights.REBTot * avREBDef
            + weights.AST * avAST
            + weights.TOV * avTOV
            + weights.PT3M * avPT3M
            + weights.FTA * avFTA
            + weights.FTM * avFTM
            + weights.FGA * avFGA
            + weights.FGM * avFGM
            + weights.BLK * avBLK
            + weights.STL * avSTL
          const avFPts = _.round(avFPtsCalc, 2)

          const projFPts = Math.round(gamesNxtWk * probPlay * avFPts)

          const cost = this.props.league == "ESP" ? costESPN : costYAH
          const avFPtsPer$ = cost == 0 ? 0 : _.round(avFPts / cost, 2)
          const avDefFPtsPer$ = cost == 0 ? 0 : _.round(avDefFPts / cost, 2)
          const avOffFPtsPer$ = cost == 0 ? 0 : _.round(avOffFPts / cost, 2)
          const avMPG = Math.floor(avSecsPlayed / 60) + ":" + Math.floor(avSecsPlayed % 60)

          res.data[idx].avFPts = avFPts
          res.data[idx].avDefFPts = avDefFPts
          res.data[idx].avOffFPts = avOffFPts
          res.data[idx].avFPtsPer$ = avFPtsPer$
          res.data[idx].avDefFPtsPer$ = avDefFPtsPer$
          res.data[idx].avOffFPtsPer$ = avOffFPtsPer$
          res.data[idx].projFPts = projFPts
          res.data[idx].cost = cost
        })
        this.setState({
          players: _.sortBy(res.data, 'name'),
        }, () => this.setStateOnParent(this.state))
      })
  }

  updateTeam = (playerID, addPlayer) => {
    if (this.state.team) {
      if (addPlayer && this.state.team.length >= this.MAX_ROSTER_SIZE) {
        alert("You have reached the limit on roster size.")
        return
      }
    }
    let player = _.filter(this.state.players, { 'playerID': playerID })
    if (addPlayer) {
      this.setState({
        team: _.union(this.state.team, player),
      }, () => this.setStateOnParent(this.state))
    } else {
      const { column, data, direction } = this.state
      this.setState({
        team: _.difference(this.state.team, player),
      }, () => this.setStateOnParent(this.state))
    }
  }

  sortPlayers = (clickedColumn) => {
    if (!this.state) {
      return
    }
    const { column, players, direction } = this.state
    if (column !== clickedColumn) {
      this.setState({
        column: clickedColumn,
        players: _.sortBy(players, clickedColumn).reverse(),
        direction: 'descending',
      }, () => this.setStateOnParent(this.state))

      return
    }

    this.setState({
      players: players.reverse(),
      direction: direction === 'ascending' ? 'descending' : 'ascending',
    }, () => this.setStateOnParent(this.state))
  }

  filterPlayers() {
    const { filteredPosition, searchFilter } = this.state
    if (searchFilter && searchFilter.length > 0) {
      // console.log('search filter')
      const searchedPlayers = _.filter(_.difference(this.state.players, this.state.team), (player) => { return searchFilter.indexOf(player.playerID) > -1 })
      if (!filteredPosition || filteredPosition === "ALL") {
        return _.intersection(_.difference(this.state.players, this.state.team), searchedPlayers)
      }
      return _.filter(_.filter(_.difference(this.state.players, this.state.team), (player) => { return searchFilter.indexOf(player.playerID) > -1 }), { 'position': this.state.filteredPosition })
    } else {
      // console.log('no search filter present')
      if (!filteredPosition || filteredPosition === "ALL") {
        return _.difference(this.state.players, this.state.team)
      }
      return _.filter(_.difference(this.state.players, this.state.team), { 'position': this.state.filteredPosition })
    }
  }

  getPlayerList() {
    const playerList = _.map(this.props.players, (player) => {
      return {
        key: player.playerID,
        text: player.name,
        value: player.playerID
      }
    })
    return playerList
  }

  render() {

    let teamChosen = true
    if (!this.state.team || this.state.team.length == 0) {
      teamChosen = false
    }

    const baseURL = process.env.NODE_ENV === "production" ? "/static" : ""

    return (
      <div>
        <video poster={baseURL + "/poster.png"} id="bgvid" playsInline muted autoPlay loop
          style={{ filter: 'blur(15px)', WebkitFilter: 'blur(15px)' }}
        >
          <source src={baseURL + "/video.mp4#t=8.5"} type="video/mp4" />
          <source src={baseURL + "/video.webm#t=8.5"} type="video/webm" />
        </video>
        <Navbar {...this.props} />
        <Container>
          <Header className="white-text" as='h2'>My Team</Header>
          <TeamHighlights teamChosen={teamChosen} team={this.state.team} league={this.props.league} />
          <PlayerGrid
            data={this.state.team}
            weights={this.props.weights}
            {...this.props}
            sortCallback={this.sortPlayers}
            updateTeamCallback={this.updateTeam}
            paginateCallback={this.paginate}
            checked={true}
          />

          <Header className="white-text" as='h2'>Players</Header>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '5px' }}>
              <b style={{ color: 'white', marginRight: '5px' }}>Search for a player</b>
              <Dropdown placeholder='Player name' value={this.state.searchFilter} multiple selection search options={this.getPlayerList()} onChange={this.handeSearchFilter} />
              <Button style={{ marginLeft: '5px' }} onClick={this.handleClearSearch}>Clear search</Button>
            </div>
            <div>
              <b style={{ color: 'white', marginRight: '5px' }}>Filter players by position</b>
              <Button.Group>
                <Button toggle onClick={this.handleFilterPosition('PG')}>PG</Button>
                <Button toggle onClick={this.handleFilterPosition('PF')}>PF</Button>
                <Button toggle onClick={this.handleFilterPosition('SG')}>SG</Button>
                <Button toggle onClick={this.handleFilterPosition('SF')}>SF</Button>
                <Button toggle onClick={this.handleFilterPosition('C')}>C</Button>
                <Button toggle onClick={this.handleFilterPosition('ALL')}>All</Button>
              </Button.Group>
            </div>
          </div>
          <PlayerGrid
            data={this.filterPlayers()}
            weights={this.props.weights}
            {...this.props}
            sortCallback={this.sortPlayers}
            updateTeamCallback={this.updateTeam}
            paginateCallback={this.paginate}
            checked={false}
          />
        </Container>
      </div>
    )
  }
}

class TeamHighlights extends React.Component {
  constructor(props, context) {
    super(props, context)
  }

  render() {
    const { teamChosen, team, league } = this.props
    const baseURL = process.env.NODE_ENV === "production" ? "/static/" : ""
    const totalProjectedPoints = _.sumBy(team, 'projFPts')
    const allStarPlayer = _.maxBy(team, 'zScores')
    const xFactorPlayer = _.maxBy(team, 'projFPts')
    const ROIPlayer = _.maxBy(team, 'avFPtsPer$')
    const xDefPlayer = _.maxBy(team, 'avDefFPts')
    const xOffPlayer = _.maxBy(team, 'avOffFPts')
    const teamRatio = _.sumBy(team, 'avOffFPts') / _.sumBy(team, 'avDefFPts')
    const teamInclination = teamRatio < 0.5 ? "def2" : teamRatio < 0.8 ? "def1" : teamRatio > 3 ? "off2" : teamRatio > 1.2 ? "off1" : "bal"
    const teamInclinImage = baseURL + teamInclination + ".png"
    const teamInclinLabel = {
      'def2': "Defensive",
      'def1': "Slightly Defensive",
      'bal': "Balanced",
      'off1': "Slightly offensive",
      'off2': "Offensive"
    }
    console.log('league: ', league)
    const totCost = _.sumBy(team, league === "ESP" ? 'costESPN' : 'costYAH')

    return (
      teamChosen ?
        <Segment.Group horizontal>
          <Segment clearing compact>

            <table className="infoTable" style={{ float: "left", marginRight: '24px' }}>
              <tbody>
                <tr>
                  <td>Total Projected Points Next Week</td>
                  <td>{totalProjectedPoints}</td>
                </tr>
                <tr>
                  <td>Next Week's All-Star</td>
                  <td>{<Link to={'/player/' + allStarPlayer.playerID}>{allStarPlayer.name}</Link>}</td>
                </tr>
                <tr>
                  <td>X-Factor Player Next Week</td>
                  <td><Link to={'/player/' + xFactorPlayer.playerID}>{xFactorPlayer.name}</Link></td>
                </tr>
                <tr>
                  <td>Highest ROI Player</td>
                  <td><Link to={'/player/' + ROIPlayer.playerID}>{ROIPlayer.name}</Link></td>
                </tr>
                <tr>
                  <td>Strongest Defensive Player</td>
                  <td><Link to={'/player/' + xDefPlayer.playerID}>{xDefPlayer.name}</Link></td>
                </tr>
                <tr>
                  <td>Strongest Offensive Player</td>
                  <td><Link to={'/player/' + xOffPlayer.playerID}>{xOffPlayer.name}</Link></td>
                </tr>
                <tr>
                  <td>Team Inclination</td>
                  <td>{teamInclinLabel[teamInclination]}<Image floated='right' src={teamInclinImage} height={20} /></td>
                </tr>
                <tr>
                  <td>Total Cost</td>
                  <td>{_.round(totCost, )}</td>
                </tr>
              </tbody>
            </table>
          </Segment>
          <Segment basic compact>
            <Popup
              trigger={
                <Link to={'/player/' + allStarPlayer.playerID}><Image centered={true} src={allStarPlayer.imageURL} height={140} /></Link>
              }
              content="Is the best player on your team (farthest from average)"
            />
            <Header textAlign="center">All-Star</Header>
          </Segment>
          <Segment basic compact>
            <Popup
              trigger={
                <Link to={'/player/' + xFactorPlayer.playerID}><Image centered={true} src={xFactorPlayer.imageURL} height={140} /></Link>
              }
              content="Has the highest projected fantasy points for next week"
            />
            <Header textAlign="center">X-Factor</Header>
          </Segment>
          <Segment basic compact>
            <Popup
              trigger={
                <Link to={'/player/' + ROIPlayer.playerID}><Image centered={true} src={ROIPlayer.imageURL} height={140} /></Link>
              }
              content="Has the highest fantasy points per $"
            />
            <Header textAlign="center">ROI</Header>
          </Segment>
          <Segment basic compact>
            <Popup
              trigger={
                <Link to={'/player/' + xDefPlayer.playerID}><Image centered={true} src={xDefPlayer.imageURL} height={140} /></Link>
              }
              content="Scores the most number of defensive fantasy points"
            />
            <Header textAlign="center">Defense</Header>
          </Segment>
          <Segment basic compact>
            <Popup
              trigger={
                <Link to={'/player/' + xOffPlayer.playerID}><Image centered={true} src={xOffPlayer.imageURL} height={140} /></Link>
              }
              content="Scores the most number of offensive fantasy points"
            />
            <Header textAlign="center">Offense</Header>
          </Segment>
        </Segment.Group>
        : ""
    )
  }
}

class PlayerSearchBar extends React.Component {
  constructor(props, context) {
    super(props, context)

    this.state = {
      values: null
    }
  }

  handleChange = (e, { value }) => {
    this.setState({ value: value })
  }

  render() {
    const { value } = this.state
    return (
      <Dropdown placeholder='Player name' multiple selection search options={this.props.playerList} onChange={this.handleChange} />
    )
  }
}

export default TeamBuilderLayout