var peopleList = positionsList = weeklyDates = [];
var $people, $positions, $generate, $schedule;
var highlightCombinations = [
    'bg-primary text-white',
    'bg-secondary text-white',
    'bg-success text-white',
    'bg-danger text-white',
    'bg-warning text-dark',
    'bg-info text-white',
    'bg-dark text-white'
];

$(function ()
{
    var $document = $(document);

    Startup = function ()
    {
        ResetSchedule();
        $people = $('#people');
        $positions = $('#positions');
    };

    ResetSchedule = function ()
    {
        if ($schedule)
            $schedule.remove();

        var clone = $('#template_schedule').clone();
        clone.attr('id', 'schedule');
        clone.removeClass('invisible');
        $('#template_schedule').after(clone);
        $schedule = $('#schedule');
    };

    CollectPeople = function ()
    {
        var people = $people.val().split(/\n/);
        var parsedPeople = [];

        for (var i in people)
        {
            if (!people[i])
                continue;

            parsedPeople.push(people[i])
        }

        return parsedPeople;
    };

    CollectPositions = function ()
    {
        var positions = $positions.val().split(/\n/);
        var parsedPositions = [];

        for (var i in positions)
        {
            if (!positions[i])
                continue;

            if (positions[i].includes('*'))
            {
                var pos = positions[i].split('*');
                parsedPositions.push({
                    name: pos[0],
                    amount: parseInt(pos[1])
                });
            }
            else
            {
                parsedPositions.push({
                    name: positions[i],
                    amount: 1
                });
            }
        }

        return parsedPositions;
    };

    BuildHeader = function (positionsList)
    {
        for (var i in positionsList)
        {
            var pos = positionsList[i];

            $schedule.find('thead > tr').append('<th' + (pos.amount > 1 ? ' colspan="' + pos.amount + '"' : '') + '>' + pos.name + '</th>');
        }
    };

    BuildRows = function (positionsList)
    {
        for (var i in positionsList)
        {
            var pos = positionsList[i];
            var trs = $schedule.find('tbody > tr');
            for (var j = 0; j < pos.amount; j++)
            {
                trs.each(function ()
                {
                    $(this).append('<td id="' + $(this).attr('id') + '_' + i + '_' + j + '"/>');
                });
            }
        }
    };

    CalculateDates = function ()
    {
        var oneJanuary = new Date('1-1-' + new Date().getFullYear());
        var currentDate = new Date(oneJanuary);
        var firstDay, lastDay, numberOfDays, weekNumber;
        var dates = [];

        while (currentDate.getFullYear() == new Date().getFullYear())
        {
            firstDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
            lastDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 6));
            numberOfDays = Math.floor((currentDate - oneJanuary) / (24 * 60 * 60 * 1000));
            weekNumber = Math.ceil((currentDate.getDay() + 1 + numberOfDays) / 7);

            dates.push({
                firstDay: firstDay,
                lastDay: lastDay,
                weekNumber: weekNumber
            });


            currentDate.setDate(lastDay.getDate() + 1);
        }

        return dates;
    };

    PopulateDates = function (weeklyDates)
    {
        for (var i in weeklyDates)
        {
            var date = weeklyDates[i];
            var firstDayFormatted = (("0" + date.firstDay.getUTCDate()).slice(-2) + '/' + ("0" + (date.firstDay.getUTCMonth() + 1)).slice(-2));
            var lastDayFormatted = (("0" + date.lastDay.getUTCDate()).slice(-2) + '/' + ("0" + (date.lastDay.getUTCMonth() + 1)).slice(-2));

            $schedule.find('tbody').append('<tr id="' + i + '"><td>' + date.weekNumber + '</td><td>' + firstDayFormatted + '</td><td>' + lastDayFormatted + '</td></tr>');
        }
    };

    GenerateRows = function ()
    {
        ResetSchedule();
        PopulateDates(weeklyDates);
        positionsList = CollectPositions();
        peopleList = CollectPeople();

        BuildHeader(positionsList);
        BuildRows(positionsList);
    };

    //Now this is ludicrous
    PopulateRows = function ()
    {
        //Total slots        
        var sumPositions = 0;
        for (var i in positionsList)
        {
            sumPositions += positionsList[i].amount;
        }
        var totalSlots = weeklyDates.length * sumPositions;
        //Calculate max number of times per person so we know the hardstop
        var hardStopPerPerson = Math.ceil(totalSlots / peopleList.length);
        var maxConsecutiveTimes = Math.ceil(weeklyDates.length / hardStopPerPerson);

        var raffleBucket = [];

        var workbench = [];

        for (var i in peopleList)
        {
            for (var j = 0; j < hardStopPerPerson; j++)
            {
                raffleBucket.push(peopleList[i]);
            }
            workbench[peopleList[i]] = {
                hardStop: hardStopPerPerson,
                currentUsage: 0,
                schedules: [],
                consecutiveUses: 0,
                highlight: highlightCombinations[i % highlightCombinations.length]
            };
        }

        shuffle(raffleBucket);

        for (var week in weeklyDates)
        {
            for (var position in positionsList)
            {
                var amount = positionsList[position].amount;
                for (var slot = 0; slot < amount; slot++)
                {
                    done = false;
                    do
                    {
                        //get a name
                        var personName = raffleBucket.shift();

                        //check name is still usable
                        if (workbench[personName].currentUsage == workbench[personName.hardStop]
                            || workbench[personName].consecutiveUses == maxConsecutiveTimes
                            || workbench[personName].schedules.includes(week))
                        {
                            raffleBucket.push(personName);
                            shuffle(raffleBucket);
                            continue;
                        }

                        $('#' + week + '_' + position + '_' + slot + '').text(personName).removeClass().addClass(workbench[personName].highlight);
                        workbench[personName].currentUsage++;
                        workbench[personName].consecutiveUses++;
                        workbench[personName].schedules.push(week);
                        done = true;
                    } while (!done)
                }
            }

            //week closed, let's reset consecutives on non-used people            
            for (var i in peopleList)
            {
                if (!workbench[peopleList[i]].schedules.includes(week))
                {
                    workbench[peopleList[i]].consecutiveUses = 0;
                }
            }
        }
    };

    $document.on('click', '#generate', function ()
    {
        GenerateRows();
        PopulateRows();
    });

    Startup();
    weeklyDates = CalculateDates();

});


function shuffle(array)
{
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0)
    {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

function pp(s)
{
    console.log(s);
}